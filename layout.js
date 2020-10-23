const TYPE_URI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const NAME_URI = 'http://schema.org/name';
const indentStep = 30;

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
 * @param {{
 *     indentLevel: number,
 *     entityColorId: number,
 *     isTarget: boolean
 * }} options
 * @return {*}
 */
function dataItemLayout(predicate, object, options) {
    const indentBlock = document.createElement('div');
    indentBlock.style.width = `${options.indentLevel * indentStep}px`;
    indentBlock.style.borderRight = `3px solid hsl(${options.entityColorId}, 60%, 70%)`;
    indentBlock.style.marginRight = '3px';

    const predicateEl = document.createElement('div');
    predicateEl.classList.add('predicate');
    const predicateTextEl = document.createElement('div');
    predicateTextEl.innerText = removeUrls(predicate.value);
    predicateEl.appendChild(indentBlock);
    predicateEl.appendChild(predicateTextEl);

    const objectEl = document.createElement('div');
    objectEl.classList.add('object');
    objectEl.innerText = object.termType === 'NamedNode' ? removeUrls(object.value) : object.value;
    if (object.termType === 'BlankNode')
        objectEl.style.display = 'none';

    const tripleRow = document.createElement('div');
    tripleRow.classList.add('triple-row');
    tripleRow.style.background = options.isTarget ? '#f4f4f4' : '#fff';
    tripleRow.appendChild(predicateEl);
    tripleRow.appendChild(objectEl);

    return tripleRow;
}

/**
 * Recursive level-based html generation
 * @param store - n3 store with quads
 * @param {string} id - current node identifier
 * @param {number} indentLevel - current indentation level
 * @param {{type: 'entity'|'property', uri: string}} target - used for highlighting target entities/properties, e.g.
 *      startDate in the Event entity
 * @return {HTMLElement[]}
 */
function markupLevel(store, id, indentLevel, target) {
    const tripleRows = [];
    let levelQuads = store.getQuads(id, undefined, undefined);
    // color identifier for current entity
    const colorId = Math.random() * 360;

    // important properties (type & name) go first
    const typeQuad = store.getQuads(id, TYPE_URI, undefined);
    const nameQuad = store.getQuads(id, NAME_URI, undefined);
    levelQuads = levelQuads.filter(x => x.predicate.value !== TYPE_URI && x.predicate.value !== NAME_URI);
    levelQuads.push(...nameQuad);
    levelQuads.push(...typeQuad);
    levelQuads.reverse();

    for (const quad of levelQuads) {
        // used for highlighting target triples
        let isTarget = target.type === 'entity' && typeQuad.length > 0 && typeQuad[0].object.value === target.uri ||
            target.type === 'property' && quad.predicate.value === target.uri;
        tripleRows.push(dataItemLayout(quad.predicate, quad.object, {
            indentLevel: indentLevel,
            entityColorId: colorId,
            isTarget: isTarget,
        }));
        tripleRows.push(...markupLevel(store, quad.object, indentLevel + 1, target));
    }
    return tripleRows;
}

/**
 * Base function that will can be called for pretty markup generation
 * @param {string} data - json-ld markup
 * @param {string} baseIRI - needed for parsing
 * @param {{type: 'entity'|'property', uri: string}} target - used for highlighting target entities/properties, e.g.
 *      startDate in the Event entity
 * @return {Promise<HTMLElement[]>}
 */
async function prettyMarkupHtml(data, baseIRI, target) {
    const store = await schemarama.inputToQuads(data, baseIRI);
    return markupLevel(store, baseIRI, 0, target);
}

/**
 * Hypothetical function that can be called every time we need to display the pretty markup
 * (target property is http://schema.org/startDate)
 * @param {string} data - jsonld markup
 * @param {string} baseIRI - needed for parsing
 * @return {Promise<void>}
 */
async function prettyMarkup(data, baseIRI) {
    const prettyMarkupDiv = document.getElementById('pretty-markup');
    const elements = await prettyMarkupHtml(data, baseIRI, {type: 'property', uri: 'http://schema.org/startDate'});
    for (const el of elements) {
        prettyMarkupDiv.appendChild(el);
    }
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
prettyMarkup(data, 'https://example.org/example');

