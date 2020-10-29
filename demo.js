const data = `
            {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@id": "#author",
                  "@type": "Person",
                  "birthDate": "1892",
                  "deathDate": "1973",
                  "name": "Tolkien, J. R. R. (John Ronald Reuel)",
                  "sameAs": "http://viaf.org/viaf/95218067"
                },
                {
                  "@id": "#trilogy",
                  "@type": "Book",
                  "about": "http://id.worldcat.org/fast/1020337",
                  "hasPart": [
                    {
                      "@id": "#book3",
                      "@type": [
                        "Book",
                        "PublicationVolume"
                      ],
                      "name": "The Return of the King",
                      "about": "http://id.worldcat.org/fast/1020337",
                      "isPartOf": "#trilogy",
                      "inLanguage": "en",
                      "volumeNumber": "3",
                      "author": "#author"
                    },
                    {
                      "@id": "#book2",
                      "@type": [
                          "Book",
                          "PublicationVolume"
                      ],
                      "name": "The Two Towers",
                      "about": "http://id.worldcat.org/fast/1020337",
                      "isPartOf": "#trilogy",
                      "inLanguage": "en",
                      "volumeNumber": "2",
                      "author": "#author"
                    },
                    {
                      "@id": "#book1",
                      "@type": [
                        "Book",
                        "PublicationVolume"
                      ],
                      "name": "The Fellowship of the Ring",
                      "about": "http://id.worldcat.org/fast/1020337",
                      "isPartOf": "#trilogy",
                      "inLanguage": "en",
                      "volumeNumber": "1",
                      "author": "#author"
                    }
                  ],
                  "name": "Lord of the Rings",
                  "inLanguage": "en",
                  "genre": "fictional",
                  "author": "#author"
                }
              ]
            }
            `;

async function prettyMarkup(data) {
    const prettyMarkupTextarea = document.getElementById('text-pretty-markup');
    prettyMarkupTextarea.value = await prettyMarkupText(data);
    const prettyMarkupDiv = document.getElementById('pretty-markup');
    let elements = await prettyMarkupHtml(data);
    for (const el of elements) {
        prettyMarkupDiv.appendChild(el);
    }
}
prettyMarkup(data);