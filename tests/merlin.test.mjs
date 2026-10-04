import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {createTransport, encode, decode} = require('../asuswrt/opt/share/exodus/www/merlin.js');
const json = value => ({ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(value)});
function fixture(options={}) {
    let packet, calls=[], counter=0, settings={other:'initial'}, clock=100000;
    const transport = createTransport({
        now:()=>clock, sleep:async ms=>{clock+=ms;}, id:()=> (++counter).toString(16).padStart(32,'0'),
        submit:async value=>{calls.push(value); packet=JSON.parse(value.exodus_packet); settings.other='new-'+packet.seq;},
        fetch:async url=>{
            if(url.includes('appGet')) return json({get_custom_settings:{...settings}});
            if(url.includes('cache')) return json(url.includes('heartbeat') ? {v:1,generated:clock/1000} :
                {v:1,key:url.includes('status')?'status':'log-app',generated:clock/1000,status:200,body:encode(JSON.stringify({running:true}))});
            return json({v:1,id:packet.id,seq:packet.seq,phase:packet.seq===packet.count-1?'complete':'accepted',status:options.failFirst && counter===1?400:200,body:encode(options.failFirst && counter===1?'{"error":"rejected"}':'{"success":true}')});
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
