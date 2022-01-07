'use strict';

const puppeteer = require('puppeteer');
const dayjs = require('dayjs');

async function getSfCom(url, daysNum) {
  try {
    if (url) {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, {
        timeout: 0,
      });

      await page.waitForTimeout(1000);

      if (daysNum > 5) {
        daysNum = 5;
      }
      let dates = [];
      for (let i = 0; i < daysNum; i++) {
        dates.push(dayjs().add(i, 'day').format('DD/MM'));
      }

      let sfCom = await page.evaluate((daysNum, dates) => {
        const table = document.querySelector('.forecast-table__basic');

        const firstTimeLabel = table
          .querySelector('tr[data-row-name="time"]')
          .querySelector('td:first-child').innerText;

        let firstDayLength;

        // Check the first day array length
        if (firstTimeLabel === 'AM') {
          firstDayLength = 3;
        } else if (firstTimeLabel === 'PM') {
          firstDayLength = 2;
        } else if (firstTimeLabel === 'Night') {
          firstDayLength = 1;
        }

        // Getting array of selectors for all the days requested
        const getDataElArr = () => {
          let dataElArr = ['td:first-child'];
          let totalArrLength;

          // Set totalArrLength according to daysNum
          if (daysNum === 1) {
            totalArrLength = firstDayLength;
          } else if (daysNum > 1 && daysNum < 6) {
            totalArrLength = firstDayLength + (daysNum - 1) * 3;
          }
          for (let i = 2; i <= totalArrLength; i++) {
            dataElArr.push(`td:nth-child(${i})`);
          }
          return dataElArr;
        };

        // Get full length array of wave energy data
        const getEnergy = (elementsArr) => {
          let energy = [];
          elementsArr.forEach((td) => {
            const query = table
              .querySelector('tr[data-row-name="energy"]')
              .querySelector(td).innerText;
            energy.push(+query);
          });
          return energy;
        };

        // Get full length array of swell data
        const getSwells = (elementsArr) => {
          let swell = [];
          elementsArr.forEach((td) => {
            const query = table
              .querySelector('tr[data-row-name="wave-height"]')
              .querySelector(td)
              .getAttribute('data-swell-state');
            swell.push(query);
          });
          return swell;
        };

        // Get swell data object from array with strings
        const getSwellObject = (swellArr) => {
          let swellParsed = [];

          swellArr.forEach((item) => {
            swellParsed.push(JSON.parse(item));
          });

          swellParsed.forEach((item) => {
            item.forEach((swell, index, item) => {
              if (swell !== null) {
                swell.angle += 180;
              } else {
                item[index] = {
                  period: '',
                  angle: '',
                  letters: '',
                  height: '',
                };
              }
            });
          });

          return swellParsed;
        };

        const getDateSortedData = (daysNum) => {
          const dataElArr = getDataElArr();
          const energy = getEnergy(dataElArr);
          const swellsDataArr = getSwells(dataElArr);
          const swellObj = getSwellObject(swellsDataArr);
          const forecast = {};

          // Define indexes of array elements to be sliced to get data for one day
          let startIndex = 0;
          let finishIndex = 0;

          // Loop to create objects for each day, depending on days number
          for (let i = 0; i < daysNum; i++) {
            if (i === 0) {
              finishIndex = firstDayLength;
            }

            //Get data for one day from main data array
            const swellDay = swellObj.slice(startIndex, finishIndex);
            const energyDay = energy.slice(startIndex, finishIndex);

            // Add date object with forecast data to main forecast object
            forecast[dates[i]] = {
              energy: energyDay,
              swell: swellDay,
            };

            // Shift indexes to next day cells
            startIndex = finishIndex;
            finishIndex += 3;
          }

          return forecast;
        };

        const forecast = getDateSortedData(daysNum);

        return {
          times: ['AM', 'PM', 'Night'],
          firstTimeLabel,
          forecast,
        };
      }, daysNum, dates);
      console.log(sfCom.forecast);
      await browser.close();
      return sfCom;
    } else {
      throw new Error('Нет урла');
    }
  } catch (error) {
    console.log(error);
  }
}

getSfCom(
  'https://www.surf-forecast.com/breaks/La-Cathedrale/forecasts/latest/six_day',
  7
);
