'use strict';

const puppeteer = require('puppeteer');

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
      console.log(wind);
      await browser.close();
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

getWind('https://www.windguru.cz/37745');