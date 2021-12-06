'use strict';

const puppeteer = require('puppeteer');

async function getMsw(url) {
  try {
    if (url) {

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, {
        timeout: 0
      });

      await page.waitForTimeout(1000);

      let msw = await page.evaluate(() => {
        const body = document.querySelector('.msw-fc.msw-js-forecast');

        function getTableElement(num) {
          return body.querySelector(`.table-forecast tbody:nth-child(${num})`);
        }

        function getAnyTableData(num) {
          const table = getTableElement(num);
          const date = table.querySelector('.tbody-title small').innerText;
          const tr = (line) => table.querySelector(`tr:nth-child(${line+2})`);

          // Get Time
          let time = [];
          for (let i = 0; i < 8; i++) {
            time[i] = tr(i).querySelector('td:first-child small').innerText.replace(/\s+/g, '');
          }
          // Get Tides
          const tideTable = table.querySelector('.msw-tide-tables div:first-child').innerText.trim().replace(/\s+/g, ' ').split(' ');
          const tides = [];
          for (let i = 0, k = 3; i < 4, k < 13; i++, k += 3) {
            tides[i] = [];
            for (let j = i * 3; j < k; j++) {
              tides[i].push(tideTable[j]);
            }
          }

          // Get Swells

          function getSwell(sizeNthChild, periodNthChild, directionNthChild) {

            function getSwellParameter(tdNthChild) {
              let parameter = [];
              for (let i = 0; i < 8; i++) {
                parameter[i] = tr(i).querySelector(`td:nth-child(${tdNthChild})`).innerText.replace(/\s+/g, '');
              }
              return parameter;
            }

            function getDirection(tdNthChild) {
              let direction = [];
              let angle = [];
              let letters = [];
              for (let i = 0; i < 8; i++) {
                direction[i] = tr(i).querySelector(`td:nth-child(${tdNthChild})`).getAttribute('data-original-title');
                if (direction[i] !== null) {
                  angle[i] = direction[i].replace(/\D/g, '');
                  letters[i] = direction[i].slice(0, 3).replace(/\s-/g, '').replace(/\s/g, '');
                } else {
                  angle[i] = '';
                  letters[i] = '';
                }
              }
              return {
                angle,
                letters
              };
            }

            const size = getSwellParameter(sizeNthChild);
            let period = getSwellParameter(periodNthChild);
            let direction = getDirection(directionNthChild);
            size.forEach((item, ind) => {
              if (item === '') {
                period[ind] = '';
                direction.angle[ind] = '';
                direction.letters[ind] = '';
              }
            });
            return {
              size,
              period,
              ...direction
            };
          }

          const swellOne = getSwell(4, 5, 6);
          const swellTwo = getSwell(7, 8, 9);
          const swellThree = getSwell(10, 11, 12);

          return {
            time,
            date,
            tides,
            swell: [{
                ...swellOne
              },
              {
                ...swellTwo
              },
              {
                ...swellThree
              }
            ]
          };
        }

        const dataTomorrow = getAnyTableData(3);

        return {
          ...dataTomorrow
        };

      });
      console.log(msw);
      await browser.close();
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

getMsw('https://magicseaweed.com/Alanya-Surf-Report/4456/');