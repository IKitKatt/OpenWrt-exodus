import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {createTransport, encode, decode} = require('../asuswrt/opt/share/exodus/www/merlin.js');
test('firmware jQuery bundle loads before state.js installs RequireJS', ()=>{
    const asp = readFileSync(new URL('../asuswrt/opt/share/exodus/www/Exodus.asp', import.meta.url), 'utf8');
    const scripts = [...asp.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1]);
    assert.ok(scripts.indexOf('/js/jquery.js') < scripts.indexOf('/state.js'));
    assert.equal(scripts.filter(path=>path==='/js/jquery.js').length, 1);
});
const json = value => ({ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(value)});
function fixture(options={}) {
    let packet, snapshot, calls=[], counter=0, settings={other:'initial'}, clock=100000;
    const transport = createTransport({
        now:()=>clock, sleep:async ms=>{clock+=ms;}, id:()=> (++counter).toString(16).padStart(32,'0'),
        submit:async(value,script)=>{
            if(value==null) {snapshot=script.slice('restart_exodus_ui_settings_'.length); return;}
            calls.push(value); packet=JSON.parse(value.exodus_packet); settings.other='new-'+packet.seq;
        },
        fetch:async url=>{
            if(url.includes('appGet')) return json({get_custom_settings:{...settings}});
            if(url.includes(snapshot+'.json')) return json({v:1,id:snapshot,seq:0,phase:'complete',status:200,body:encode(JSON.stringify(settings))});
            if(url.includes('cache')) return json(url.includes('heartbeat') ? {v:1,generated:clock/1000} :
                {v:1,key:url.includes('status')?'status':'log-app',generated:clock/1000,status:200,body:encode(JSON.stringify({running:true}))});
            const first=packet.id==='1'.padStart(32,'0');
            return json({v:1,id:packet.id,seq:packet.seq,phase:packet.seq===packet.count-1?'complete':'accepted',status:options.failFirst && first?400:200,body:encode(options.failFirst && first?'{"error":"rejected"}':'{"success":true}')});
        }, ...options
    });
    return {transport,calls};
}
test('unicode codec', ()=>assert.equal(decode(encode('Привет 😀 <% x %>')), 'Привет 😀 <% x %>'));
test('packet limit and fresh foreign settings before each post', async()=>{
    const f=fixture(); await f.transport.request('file_write',{path:'/opt/etc/exodus/profiles/demo.yaml',content:'Привет 😀'.repeat(400)});
    assert.ok(f.calls.length>1);
    for(let i=0;i<f.calls.length;i++) {
        assert.ok(JSON.parse(f.calls[i].exodus_packet).data.length<=1800);
        assert.ok(Buffer.byteLength(JSON.stringify(f.calls[i]))<=7680);
        assert.equal(f.calls[i].other, i===0?'initial':'new-'+(i-1));
    }
});
test('8 MiB upload keeps progressing beyond five minutes', async()=>{
    const f=fixture();
    assert.equal((await f.transport.request('profile_upload',{name:'large.yaml',content:'x'.repeat(8388608)})).success,true);
    assert.ok(f.calls.length>6000);
});
test('response id and seq mismatch is not success', async()=>{
    const f=fixture({fetch:async url=>url.includes('appGet')?json({get_custom_settings:{}}):json({v:1,id:'f'.repeat(32),seq:7,phase:'complete',status:200,body:encode('{}')})});
    await assert.rejects(f.transport.request('load'), /unknown|timed out/i);
});
test('failed request does not poison queue', async()=>{
    const f=fixture({failFirst:true});
    await assert.rejects(f.transport.request('load'));
    assert.equal((await f.transport.request('load')).success,true);
    f.transport.dispose();
});
test('frequent reads never post and coalesce during upload', async()=>{
    const f=fixture(); const results=await Promise.all(Array.from({length:100},()=>f.transport.request('status')));
    assert.equal(f.calls.length,0); assert.ok(results.every(x=>x.running));
});
test('stale cache is not running', async()=>{
    const f=fixture({fetch:async()=>json({v:1,key:'status',generated:1,status:200,body:encode('{"running":true}')})});
    await assert.rejects(f.transport.request('status'),/stale/i);
});
test('oversize rejected before post', async()=>{
    const f=fixture(); await assert.rejects(f.transport.request('file_write',{content:'я'.repeat(4194305)}), /8 MiB/);
    assert.equal(f.calls.length,0);
});
test('html login response stops queue', async()=>{
    const f=fixture({fetch:async()=>({ok:true,status:200,headers:{get:()=> 'text/html'},text:async()=>'<html>Login</html>'})});
    await assert.rejects(f.transport.request('load'),/Web Admin/);
    await assert.rejects(f.transport.request('load'),/Web Admin/);
    assert.equal(f.calls.length,0);
});
test('dispose stops requests', async()=>{
    const f=fixture(); f.transport.dispose(); await assert.rejects(f.transport.request('load'),/closed/i);
});
test('firmware HTML 404 while pending does not expire session', async()=>{
    let packet, polls=0, clock=0, expired=0, snapshot=false;
    const f=createTransport({now:()=>clock,sleep:async ms=>{clock+=ms;},id:()=> '1'.repeat(32),
        onLogin:()=>expired++, submit:async settings=>{snapshot=settings==null;if(settings) packet=JSON.parse(settings.exodus_packet);},
        fetch:async url=>{
            if(url.includes('appGet')) return json({get_custom_settings:{}});
            if(++polls===1) return {ok:false,status:404,text:async()=>'<html><body>404 Not Found</body></html>'};
            return json({v:1,id:packet?.id || '1'.repeat(32),seq:0,phase:'complete',status:200,body:encode(snapshot?'{}':'{"success":true}')});
        }});
    await f.request('load'); await f.request('load'); assert.equal(expired,0);
});
function settingsFixture(foreign, missing=false) {
    let packet, snapshotId, clock=0, serial=0, submissions=[];
    const f=createTransport({now:()=>clock,sleep:async ms=>{clock+=ms;},id:()=> (++serial).toString(16).padStart(32,'0'),
        submit:async(settings,script)=>{
            if(!settings) snapshotId=script.slice('restart_exodus_ui_settings_'.length);
            else {submissions.push(settings); packet=JSON.parse(settings.exodus_packet);}
        }, fetch:async url=>{
            // Actual minimum firmware getter loses spaces/empty values or returns invalid JSON.
            if(url.includes('appGet')) return missing ? {ok:true,status:200,text:async()=>'{"get_custom_settings": new Object()}'} : json({get_custom_settings:{addon_title:'Cool'}});
            const id=url.match(/([0-9a-f]{32})\.json/)[1];
            return json({v:1,id,seq:0,phase:'complete',status:200,body:encode(JSON.stringify(id===snapshotId?foreign:{success:true}))});
        }});
    return {transport:f,submissions};
}
test('complete foreign settings including spaces and empty values are preserved', async()=>{
    const foreign={addon_title:'Cool Addon 1.0',empty:'',literal:'"Привет 😀" <% test %>',spaced:'  keep  ',error:'ordinary foreign setting'};
    const f=settingsFixture(foreign); await f.transport.request('load');
    for(const [key,value] of Object.entries(foreign)) assert.equal(f.submissions[0][key],value);
});
test('missing shared settings starts from empty object without firmware eval', async()=>{
    const f=settingsFixture({},true); assert.equal((await f.transport.request('load')).success,true);
    assert.deepEqual(Object.keys(f.submissions[0]),['exodus_packet']);
});
test('native snapshot form omits amng_custom and packet form restores it', async()=>{
    const previousDocument=globalThis.document, previousLocation=globalThis.location;
    let clock=0, serial=0;
    const posts=[], fields=Object.fromEntries(['flag','current_page','next_page','action_script','amng_custom'].map(key=>[key,{value:'',disabled:false}]));
    const form={elements:fields,submit(){posts.push(Object.fromEntries(Object.entries(fields).filter(([,field])=>!field.disabled).map(([name,field])=>[name,field.value])));}};
    globalThis.document={getElementById:()=>form}; globalThis.location={pathname:'/user3.asp'};
    try {
        const f=createTransport({now:()=>clock,sleep:async ms=>{clock+=ms;},id:()=> (++serial).toString(16).padStart(32,'0'),
            fetch:async url=>{
                const current=posts.at(-1), snapshot=!('amng_custom' in current);
                const id=snapshot?current.action_script.slice('restart_exodus_ui_settings_'.length):JSON.parse(current.amng_custom).exodus_packet;
                return json({v:1,id:snapshot?id:JSON.parse(id).id,seq:0,phase:'complete',status:200,body:encode(snapshot?'{"other":"Cool Addon 1.0"}':'{"success":true}')});
            }});
        assert.equal((await f.request('load')).success,true);
        assert.equal(posts.length,2);
        assert.ok(posts.every(post=>post.flag==='background'), 'native requests must not redirect or show firmware Loading');
        assert.ok(!('amng_custom' in posts[0]));
        assert.equal(posts[1].action_script,'restart_exodus_ui');
        assert.equal(JSON.parse(posts[1].amng_custom).other,'Cool Addon 1.0');
        assert.equal(posts[1].current_page,'user3.asp');
    } finally {globalThis.document=previousDocument;globalThis.location=previousLocation;}
});
