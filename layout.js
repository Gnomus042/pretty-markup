/**
 * @param {string} text
 * @return {string}
 */
function removeUrls(text) {
    return text.replaceAll(/https?:\/\/[^\s]+[\/#]/g, '');
}

/**
 * Makes an html layout for a single triple
 * @param predicate
 * @param object
 * @param {number} indent - used for making padding for nested structures
 * @return {string}
 */
function dataItemLayout(predicate, object, indent, color) {
    let trueIndent = indent * 30;
    // removing prefix urls from the predicate (looks better and simpler)
    let predicateStr = removeUrls(predicate.value);
    let objectStr = object.termType === 'NamedNode' ? removeUrls(object.value) : object.value;

    // temporary hack for hiding blank nodes
    let blankNodeHack = '';
    if (object.termType === 'BlankNode') {
        blankNodeHack = 'style="display: none"';
    }
    return `<div class="data-item">
        <div class="info">
            <div class="predicate"><div style='width: ${trueIndent}px; border-right:3px solid ${color}; margin-right: 3px'></div><div>${predicateStr}</div></div>
            <div class="object" ${blankNodeHack}>${objectStr}</div>
        </div>
    </div>`;
}

/**
 * Recursive level-based html generation
 * @param store - n3 store with quads
 * @param {string} id - current node identifier
 * @param {number} indent - current indentation level
 * @return {string[]}
 */
function markupLevel(store, id, indent) {
    const dataItems = [];
    let levelQuads = store.getQuads(id, undefined, undefined);
    const color = `hsl(${Math.random()*360}, 60%, 70%)`;

    // important properties (type & name) go first
    const typeQuad = store.getQuads(id, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', undefined);
    const nameQuad = store.getQuads(id, 'http://schema.org/name', undefined);
    levelQuads = levelQuads.filter(x => x.predicate.value !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
        x.predicate.value !== 'http://schema.org/name');
    levelQuads.push(...nameQuad);
    levelQuads.push(...typeQuad);
    levelQuads.reverse();

    for (const quad of levelQuads) {
        dataItems.push(dataItemLayout(quad.predicate, quad.object, indent, color));
        dataItems.push(...markupLevel(store, quad.object, indent + 1));
    }
    return dataItems;
}

/**
 * Base function that will can be called for pretty markup generation
 * @param {data} markup
 * @param {string} baseIRI
 * @return {Promise<string>}
 */
async function prettyMarkupHtml(data, baseIRI) {
    const store = await schemarama.inputToQuads(data, baseIRI);
    return markupLevel(store, baseIRI, 0).join('');
}

/**
 * Hypothetical function that can be called every time we need to display the pretty markup
 * @param data
 * @param baseIRI
 * @return {Promise<void>}
 */
async function prettyMarkup(data, baseIRI) {
    const prettyMarkupDiv = document.getElementById('pretty-markup');
    const html = await prettyMarkupHtml(data, baseIRI);
    prettyMarkupDiv.insertAdjacentHTML('beforeend', html);
}

const data = `
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Miami Heat at Philadelphia 76ers - Game 3 (Home Game 1)",
  "location": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Philadelphia",
      "addressRegion": "PA"
    },
    "url": "wells-fargo-center.html"
  },
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "$35",
    "offerCount": "1938"
  },
  "startDate": "2016-04-21T20:00",
  "url": "nba-miami-philidelphia-game3.html"
}
`;
prettyMarkup(data, 'https://schema.org/Event');

