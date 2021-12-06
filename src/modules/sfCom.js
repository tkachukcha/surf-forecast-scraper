'use strict';

const puppeteer = require('puppeteer');

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

      console.log(sfCom);
      await browser.close();
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

getSfCom('https://www.surf-forecast.com/breaks/La-Cathedrale/forecasts/latest/six_day');