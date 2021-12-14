'use strict';

const puppeteer = require('puppeteer');

async function getWind(url, daysNum) {
  try {
    if (url) {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, {
        timeout: 0
      });

      await page.waitForTimeout(5000); // Задержка для подгрузки всех данных

      let wind = await page.evaluate((daysNum) => {

        let tds = document.querySelectorAll('.tabulka tbody #tabid_0_0_dates td');
        let now = new Date();
        let tomorrow = now.getDay() + 1;

        // ТУТ НАДО ПОПРАВИТЬ КОСЯК С ДАТОЙ НОЧЬЮ
        function getDate(now, plusNumDays) {
          if (now.getHours() < 2) {
            tomorrow = now.getDay();
          }
          const date = (now.getDate() + plusNumDays) + '/' + (now.getMonth() + 1);
          return date;
        }

        // Check if it's night time (UTC +3)
        if (now.getHours() < 2) {
          tomorrow = now.getDay();
        }

        // Get starting index of tomorrow
        let startingColumnIndex = 0;

        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        do {
          startingColumnIndex++;
        } while (tds[startingColumnIndex].innerText.slice(0, 2) !== days[tomorrow]);

        function getData(id, startingColumnIndex, columnsNum) {
          const dataTds = document.querySelectorAll(`.tabulka tbody #${id} td`);
          let data = [];
          for (let i = startingColumnIndex; i < startingColumnIndex + columnsNum; i++) {
            data.push(dataTds[i].innerText);
          }
          return data;
        }

        function getDirections(id, startingColumnIndex, columnsNum) {
          const dataTds = document.querySelectorAll(`.tabulka tbody #${id} td span`);
          let data = [];
          for (let i = startingColumnIndex; i < startingColumnIndex + columnsNum; i++) {
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

        function getOneDayData(startingColumnIndex, daysNum) {
          let columnsNum = 10;
          if (daysNum > 3) {
            columnsNum = 7;
          }

          if (daysNum && (daysNum > 7 || daysNum <= 0)) {
            throw new Error('Количество дней должно быть более 0 и менее 8');
          } else if (daysNum && daysNum < 4) {
            startingColumnIndex += ((daysNum - 1) * 10);
          } else if (daysNum && daysNum > 3) {
            startingColumnIndex += 30 + (daysNum - 4) * 7;
          }

          // Change number of columns for one day forecast if forecast is more than 3 days away

          const speed = getData('tabid_0_0_WINDSPD', startingColumnIndex, columnsNum);
          const gusts = getData('tabid_0_0_GUST', startingColumnIndex, columnsNum);
          const swellHeight = getData('tabid_0_0_HTSGW', startingColumnIndex, columnsNum);
          const swellPeriod = getData('tabid_0_0_PERPW', startingColumnIndex, columnsNum);
          const windDirections = getDirections('tabid_0_0_SMER', startingColumnIndex, columnsNum);
          const swellDirections = getDirections('tabid_0_0_DIRPW', startingColumnIndex, columnsNum);

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
        }

        const data = {};

        function getDataForDaysNum(daysNum) {
          for (i = 0; i < daysNum; i++) {
            data[getDate(now, i)] = {
                ...getOneDayData(startingColumnIndex, daysNum),
              };
            }
        }

        getDataForDaysNum(daysNum);
        

        return data;

      }, daysNum);
      console.log(wind);
      await browser.close();
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

getWind('https://www.windguru.cz/37745', 2);