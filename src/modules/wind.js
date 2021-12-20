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

      await page.waitForTimeout(15000); // Timeout to DOM get all the data

      let wind = await page.evaluate((daysNum) => {
        const getDatesArr = () => {
          let dates = [];
          tds.forEach(td => {
            dates.push(+td.innerText.slice(3, 5))
          });
          return dates;
        };


        const getDaysStartingIndexes = (datesArr, daysNum) => {
          if (daysNum > 5) {
            daysNum = 5;
          }
          let daysStartingIndexes = [0];
          let currentDate = datesArr[0]
          const startingDate = currentDate;
          const endingDate = startingDate + daysNum + 1;

          for (let i = startingDate; i < endingDate; i++) {
            const ind = datesArr.findIndex(date => date === currentDate + 1)
            daysStartingIndexes.push(ind);
            currentDate++;
          }
          return daysStartingIndexes;
        };

        const getData = (id, startingColumnIndex, columnsNum) => {
          const dataTds = document.querySelectorAll(`.tabulka tbody #${id} td`);
          let data = [];
          for (let i = startingColumnIndex; i < startingColumnIndex + columnsNum; i++) {
            data.push(dataTds[i].innerText);
          }
          return data;
        };

        const getDirections = (id, startingColumnIndex, columnsNum) => {
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
        };

        const getOneDayData = (startingColumnIndex, columnsNum) => {

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
        };

        const getAllDaysData = (indexes) => {
          let data = {};
          const now = new Date;
          indexes.forEach((index, ind, arr) => {
            if (ind !== arr.length - 1) {
              data[`${now.getDate() + ind}/${now.getMonth()+1}`] = {
                ...getOneDayData(index, arr[ind + 1] - index),
              };
            }
          });

          return data;
        };

        const tds = document.querySelectorAll('.tabulka tbody #tabid_0_0_dates td');
        const datesArr = getDatesArr();
        const daysStartingIndexes = getDaysStartingIndexes(datesArr, daysNum)
        const data = getAllDaysData(daysStartingIndexes);

        const getTimesArr = () => {
          let timesArrOne = [];
          let timesArrTwo = [];
          for (let i = 3, j = 0; j < 10; i+=2, j++) {
              timesArrOne.push(`${i}h`);
          }
          for (let i = 3, j = 0; j < 7; i+=3, j++) {
              timesArrTwo.push(`${i}h`);
          }
          return [timesArrOne, timesArrTwo];
        }

        const times = getTimesArr();

        return {
          times,
          ...data
        };
      }, daysNum);
      console.log(wind);
      await browser.close();
      return wind;
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

getWind('https://www.windguru.cz/37745', 7);