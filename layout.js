const TYPE_URI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const NAME_URI = 'http://schema.org/name';
const indentStep = 30;

/**
 * @param {string} text
 * @return {string}
 */
function replacePrefix(text) {
    text = text.replaceAll(/https?:\/\/schema.org\//g, '');
    text = text.replaceAll(/http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#/g, '')
    text = text.replaceAll(/http:\/\/www.w3.org\/2000\/01\/rdf-schema#/g, '');
    return text;
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
    predicateTextEl.innerText = replacePrefix(predicate.value);
    predicateEl.appendChild(indentBlock);
    predicateEl.appendChild(predicateTextEl);

    const objectEl = document.createElement('div');
    objectEl.classList.add('object');
    objectEl.innerText = object.termType === 'NamedNode' ? replacePrefix(object.value) : object.value;
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
 * @param {string[]} displayed
 * @param {number} indentLevel - current indentation level
 * @param {{type: 'entity'|'property', uri: string}|undefined} target - used for highlighting target entities/properties, e.g.
 *      startDate in the Event entity
 * @return {HTMLElement[]}
 */
function markupLevel(store, id, displayed, indentLevel, target = undefined) {
    if (displayed.includes(id)) return []
    displayed.push(id);
    let levelQuads = store.getQuads(id, undefined, undefined);
    const tripleRows = [];
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
        let isTarget = target && (target.type === 'entity' && typeQuad.length > 0 && typeQuad[0].object.value === target.uri ||
            target.type === 'property' && quad.predicate.value === target.uri);
        tripleRows.push(dataItemLayout(quad.predicate, quad.object, {
            indentLevel: indentLevel,
            entityColorId: colorId,
            isTarget: isTarget,
        }));
        tripleRows.push(...markupLevel(store, quad.object.id, displayed, indentLevel + 1, target));
    }
    return tripleRows;
}

/**
 * Base function that will can be called for pretty markup generation
 * @param {string} data - json-ld markup
 * @param {{baseUrl?: string, target?: {type: 'entity'|'property', uri: string}}|undefined} options
 *  - used for highlighting target entities/properties, e.g. startDate in the Event entity
 * @return {Promise<HTMLElement[]>}
 */
async function prettyMarkupHtml(data, options = undefined) {
    let baseUrl = options && options.baseUrl ? options.baseUrl : 'http://example.org';
    let target = options && options.target ? options.target : undefined;
    try {
        JSON.parse(data);
    } catch (e) {
        let domParser = new DOMParser();
        let jsonld = [].slice.call(domParser.parseFromString(data, 'text/html')
            .getElementsByTagName('script'))
            .filter(x => x.type === 'application/ld+json');
        // if there is exactly one json-ld, then parse it, else throw an exception
        // (I assume that only one json-ld can be in the example, but if not we still can
        // parse and display more than one)
        if (jsonld.length === 1) data = jsonld[0].innerText;
        else if (jsonld.length > 1) throw 'not single json-ld in the example';
    }
    const shapes = schemarama.quadsToShapes(await schemarama.inputToQuads(data, baseUrl));
    const tripleRows = [];
    for (const [id, shape] of shapes.entries()) {
        tripleRows.push(...markupLevel(shape, id, [], 0, target));
    }
    return tripleRows;
}

/**
 * Hypothetical function that can be called every time we need to display the pretty markup
 * @param {string} data - json-ld markup
 * @return {Promise<void>}
 */
async function prettyMarkup(data) {
    const prettyMarkupDiv = document.getElementById('pretty-markup');
    const elements = await prettyMarkupHtml(data);
    for (const el of elements) {
        prettyMarkupDiv.appendChild(el);
    }
}

const data = `
<script type="application/ld+json">
{
  "@context":  "https://schema.org/",
  "@id": "#record",
  "@type": "Book",
  "additionalType": "Product",
  "name": "Le concerto",
  "author": "Ferchault, Guy",
  "offers":{
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "serialNumber": "CONC91000937",
      "sku": "780 R2",
      "offeredBy": {
          "@type": "Library",
          "@id": "http://library.anytown.gov.uk",
          "name": "Anytown City Library"
      },
      "businessFunction": "http://purl.org/goodrelations/v1#LeaseOut",
      "itemOffered": "#record"
    }
}
</script>
`;
prettyMarkup(data);

