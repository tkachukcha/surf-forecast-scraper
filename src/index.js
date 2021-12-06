'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const pug = require('pug');
const { get } = require('http');

async function getWind(url) {
  try {
    if (url) {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, {
        timeout: 0
      });
      
      await page.waitForTimeout(5000); // Задержка для подгрузки всех данных

      let wind = await page.evaluate(() => {

        // Get starting index of tomorrow

        let tds = document.querySelectorAll('.tabulka tbody #tabid_0_0_dates td');
        let now = new Date();
        let tomorrow = now.getDay() + 1;
        let tomorrowColumnIndex = 0;
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        do {
          tomorrowColumnIndex++;
        } while (tds[tomorrowColumnIndex].innerText.slice(0, 2) !== days[tomorrow]);
  
        function getData(id) {
          const dataTds = document.querySelectorAll(`.tabulka tbody #${id} td`);
          let data = [];
          for (let i = tomorrowColumnIndex; i < tomorrowColumnIndex + 10; i++) {
            data.push(dataTds[i].innerText);
          }
          return data;
        }
  
        function getDirections(id) {
          const dataTds = document.querySelectorAll(`.tabulka tbody #${id} td span`);
          let data = [];
          for (let i = tomorrowColumnIndex; i < tomorrowColumnIndex + 10; i++) {
            data.push(dataTds[i].getAttribute('title'));
          }
  
          let angle = [];
          let letters = [];
          data.forEach(item => {
            letters.push(item.replace(/[^NESW]/g, ''));
            angle.push(Math.floor(Number(item.replace(/[^0-9.]/g, ''))));
          });
          return {
            letters: letters,
            angle: angle
          };
        }
  
        const speed = getData('tabid_0_0_WINDSPD');
        const gusts = getData('tabid_0_0_GUST');
        const swellHeight = getData('tabid_0_0_HTSGW');
        const swellPeriod = getData('tabid_0_0_PERPW');
        const windDirections = getDirections('tabid_0_0_SMER');
        const swellDirections = getDirections('tabid_0_0_DIRPW');
  
        return {
          windSpeed: speed,
          windGusts: gusts,
          windAngle: windDirections.angle,
          windLetters: windDirections.letters,
          swellHeight: swellHeight,
          swellPeriod: swellPeriod,
          swellAngle: swellDirections.angle,
          swellLetters: swellDirections.letters,
        };
      });
      
      await browser.close();
      return wind;
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

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
      await browser.close();
      return msw;
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

async function getSfCom(url) {
  try {
    if (url) {

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, {
        timeout: 0
      });

      await page.waitForTimeout(1000);

      let sfCom = await page.evaluate(() => {
        const table = document.querySelector('.forecast-table__basic');
        const firstTimeLabel = table.querySelector('tr[data-row-name="time"]').querySelector('td:first-child').innerText;
        let tdsArr = [];
        if (firstTimeLabel === 'AM') {
          tdsArr = ['td:nth-child(4)', 'td:nth-child(5)', 'td:nth-child(6)'];
        } else if (firstTimeLabel === 'PM') {
          tdsArr = ['td:nth-child(3)', 'td:nth-child(4)', 'td:nth-child(5)'];
        } else if (firstTimeLabel === 'Night') {
          tdsArr = ['td:nth-child(2)', 'td:nth-child(3)', 'td:nth-child(4)'];
        }
        let energy = [];
        tdsArr.forEach(td => {
          const query = table.querySelector('tr[data-row-name="energy"]').querySelector(td).innerText;
          energy.push(+query);
        });

        let swell = [];

        tdsArr.forEach(td => {
          const query = table.querySelector('tr[data-row-name="wave-height"]').querySelector(td).getAttribute('data-swell-state');
          swell.push(query);
        });

        let swellParsed = [];

        swell.forEach(item => {
          swellParsed.push(JSON.parse(item));
        });


        swellParsed.forEach(item => {
          item.forEach((swelll, index, item) => {
            if (swelll !== null) {
              swelll.angle += 180;
            } else {
              item[index] = {
                "period": '',
                "angle": '',
                "letters": '',
                "height": ''
              };
            }
          });
        });

        return {
          time: ['AM', 'PM', 'Night'],
          energy,
          swell: swellParsed,
        };

      });

      await browser.close();
      return sfCom;
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

async function getData(spotUrls) {
  const wind = await getWind(spotUrls[2]);
  const msw = await getMsw(spotUrls[3]);
  const sfCom = await getSfCom(spotUrls[4]);
  let forecast = {
    spotName: spotUrls[0],
    region: spotUrls[1],
    msw,
    wind,
    sfCom,
  };
  return forecast;
}

async function writeData(spots, fileName) {
  const data = await getData(spots);
  const forecastJson = JSON.stringify(data);
  fs.writeFileSync(`output/${fileName}.json`, forecastJson);
}

const spots = [
  ['Imsouane, The Cathedral', 'Morocco', 'https://www.windguru.cz/49304', 'https://magicseaweed.com/Imsouane-Cathedral-Point-Surf-Report/990/', 'https://www.surf-forecast.com/breaks/La-Cathedrale/forecasts/latest/six_day'],
  ['Anchor Point', 'Morocco', 'https://www.windguru.cz/549853', 'https://magicseaweed.com/Anchor-Point-Surf-Report/905/', 'https://www.surf-forecast.com/breaks/La-Pointedes-Ancres/forecasts/latest/six_day'],
  ['Alanya', 'Turkey (Mediterranian)', 'https://www.windguru.cz/37745', 'https://magicseaweed.com/Alanya-Surf-Report/4456/', 'https://www.surf-forecast.com/breaks/Side-West-Beach/forecasts/latest/six_day']
];

writeData(spots[2], 'data1');

