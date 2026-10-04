/**
 * Prefixes root-relative links of the content with the base of the site, so pages can link to `/install/openwrt/`
 * while the site lives under `/openwrt-exodus/`. Covers markdown links and the `href` of MDX components (LinkCard).
 */
export default function rehypeBaseLinks({ base }) {
	const prefix = base.replace(/\/$/, '');
	const fix = (href) =>
		typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.startsWith(`${prefix}/`)
			? `${prefix}${href}`
			: href;

	const walk = (node) => {
		if (node.type === 'element' && node.tagName === 'a' && node.properties) {
			node.properties.href = fix(node.properties.href);
		}
		if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.attributes) {
			for (const attribute of node.attributes) {
				if (attribute.name === 'href') attribute.value = fix(attribute.value);
			}
		}
		node.children?.forEach(walk);
	};

	return (tree) => walk(tree);
}
