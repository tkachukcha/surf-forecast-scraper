'use strict';

const puppeteer = require('puppeteer');
const dayjs = require('dayjs');
const fs = require('fs');
const pug = require('pug');

async function getData(spotUrls, daysNum) {
  try {
    if (daysNum > 5) {
      daysNum = 5;
    }

    // Get dates array according to requested days number
    const dates = [];
    for (let i = 0; i < daysNum; i++) {
      dates.push(dayjs().add(i, 'day').format('DD/MM'));
    }

    // Open browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // WindGuru: check if URL is available and get data
    let wind;
    const windUrl = spotUrls[2];
    if (windUrl) {
      await page.goto(windUrl, {
        timeout: 0,
      });

      await page.waitForTimeout(5000);

      wind = await page.evaluate(
        (daysNum, dates) => {
          const getDatesArr = () => {
            let dates = [];
            tds.forEach((td) => {
              dates.push(+td.innerText.slice(3, 5));
            });
            return dates;
          };

          const getDaysStartingIndexes = (datesArr, daysNum) => {
            if (daysNum > 5) {
              daysNum = 5;
            }
            let daysStartingIndexes = [0];
            let currentDate = datesArr[0];
            const startingDate = currentDate;
            const endingDate = startingDate + daysNum;

            for (let i = startingDate; i < endingDate; i++) {
              const ind = datesArr.findIndex(
                (date) => date === currentDate + 1
              );
              daysStartingIndexes.push(ind);
              currentDate++;
            }
            return daysStartingIndexes;
          };

          const getData = (id, startingColumnIndex, columnsNum) => {
            const dataTds = document.querySelectorAll(
              `.tabulka tbody #${id} td`
            );
            let data = [];
            for (
              let i = startingColumnIndex;
              i < startingColumnIndex + columnsNum;
              i++
            ) {
              data.push(dataTds[i].innerText);
            }
            return data;
          };

          const getDirections = (id, startingColumnIndex, columnsNum) => {
            const dataTds = document.querySelectorAll(
              `.tabulka tbody #${id} td span`
            );
            let data = [];
            for (
              let i = startingColumnIndex;
              i < startingColumnIndex + columnsNum;
              i++
            ) {
              data.push(dataTds[i].getAttribute('title'));
            }

            let angle = [];
            let letters = [];
            data.forEach((item) => {
              letters.push(item.replace(/[^NESW]/g, ''));
              angle.push(Math.floor(Number(item.replace(/[^0-9.]/g, ''))));
            });
            return {
              letters: letters,
              angle: angle,
            };
          };

          const getOneDayData = (startingColumnIndex, columnsNum) => {
            const speed = getData(
              'tabid_0_0_WINDSPD',
              startingColumnIndex,
              columnsNum
            );
            const gusts = getData(
              'tabid_0_0_GUST',
              startingColumnIndex,
              columnsNum
            );
            const swellHeight = getData(
              'tabid_0_0_HTSGW',
              startingColumnIndex,
              columnsNum
            );
            const swellPeriod = getData(
              'tabid_0_0_PERPW',
              startingColumnIndex,
              columnsNum
            );
            const windDirections = getDirections(
              'tabid_0_0_SMER',
              startingColumnIndex,
              columnsNum
            );
            const swellDirections = getDirections(
              'tabid_0_0_DIRPW',
              startingColumnIndex,
              columnsNum
            );

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
            const now = new Date();
            let today = now.getDate();
            if (now.getHours() < 2) {
              today--;
            }
            // for (let i = 0; i < indexes.length)
            indexes.forEach((index, ind, arr) => {
              if (ind !== arr.length - 1) {
                // data[`${today + ind}/${now.getMonth() + 1}`] = {
                //   ...getOneDayData(index, arr[ind + 1] - index),
                // };
                data[dates[ind]] = {
                  ...getOneDayData(index, arr[ind + 1] - index),
                };
              }
            });

            return data;
          };

          const tds = document.querySelectorAll(
            '.tabulka tbody #tabid_0_0_dates td'
          );
          const datesArr = getDatesArr();
          const daysStartingIndexes = getDaysStartingIndexes(datesArr, daysNum);
          const data = getAllDaysData(daysStartingIndexes);

          const getTimesArr = () => {
            let timesArrOne = [];
            let timesArrTwo = [];
            for (let i = 3, j = 0; j < 10; i += 2, j++) {
              timesArrOne.push(`${i}h`);
            }
            for (let i = 3, j = 0; j < 7; i += 3, j++) {
              timesArrTwo.push(`${i}h`);
            }
            return [timesArrOne, timesArrTwo];
          };

          const times = getTimesArr();

          return {
            times,
            forecast: { ...data },
          };
        },
        daysNum,
        dates
      );
    } else {
      throw new Error('WindGuru Url is undefined');
    }

    // MSW: check if URL is available and get data
    let msw;
    const mswUrl = spotUrls[3];
    if (mswUrl) {
      await page.goto(mswUrl, {
        timeout: 0,
      });

      await page.waitForTimeout(1000);

      msw = await page.evaluate(
        (daysNum, dates) => {
          const body = document.querySelector('.msw-fc.msw-js-forecast');

          function getTableElement(num) {
            return body.querySelector(
              `.table-forecast tbody:nth-child(${num})`
            );
          }

          const getTimes = () => {
            const table = getTableElement(2);
            const tr = (line) =>
              table.querySelector(`tr:nth-child(${line + 2})`);

            // Get Time
            let time = [];
            for (let i = 0; i < 8; i++) {
              time[i] = tr(i)
                .querySelector('td:first-child small')
                .innerText.replace(/\s+/g, '');
            }

            return time;
          };

          function getAnyTableData(num) {
            const table = getTableElement(num);
            // const date = table.querySelector('.tbody-title small').innerText;
            const tr = (line) =>
              table.querySelector(`tr:nth-child(${line + 2})`);

            // Get Tides
            const tideTable = table
              .querySelector('.msw-tide-tables div:first-child')
              .innerText.trim()
              .replace(/\s+/g, ' ')
              .split(' ');
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
                  parameter[i] = tr(i)
                    .querySelector(`td:nth-child(${tdNthChild})`)
                    .innerText.replace(/\s+/g, '');
                }
                return parameter;
              }

              function getDirection(tdNthChild) {
                let direction = [];
                let angle = [];
                let letters = [];
                for (let i = 0; i < 8; i++) {
                  direction[i] = tr(i)
                    .querySelector(`td:nth-child(${tdNthChild})`)
                    .getAttribute('data-original-title');
                  if (direction[i] !== null) {
                    angle[i] = direction[i].replace(/\D/g, '');
                    letters[i] = direction[i]
                      .slice(0, 3)
                      .replace(/\s-/g, '')
                      .replace(/\s/g, '');
                  } else {
                    angle[i] = '';
                    letters[i] = '';
                  }
                }
                return {
                  angle,
                  letters,
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
                ...direction,
              };
            }

            const swellOne = getSwell(4, 5, 6);
            const swellTwo = getSwell(7, 8, 9);
            const swellThree = getSwell(10, 11, 12);

            return {
              tides,
              swell: [
                {
                  ...swellOne,
                },
                {
                  ...swellTwo,
                },
                {
                  ...swellThree,
                },
              ],
            };
          }

          function getForecastByNumberofDays(daysNumber) {
            const data = {};
            for (let i = 2; i < daysNumber + 2; i++) {
              // data[getAnyTableData(i).date] = getAnyTableData(i);
              data[dates[i - 2]] = getAnyTableData(i);
            }
            return data;
          }

          const data = getForecastByNumberofDays(daysNum);
          const times = getTimes();

          return {
            times,
            forecast: { ...data },
          };
        },
        daysNum,
        dates
      );
    } else {
      throw new Error('MSW Url is undefined');
    }

    // Surf-forecast: check if URL is available and get data
    let sfCom;
    const sfComUrl = spotUrls[4];
    if (sfComUrl) {
      await page.goto(sfComUrl, {
        timeout: 0,
      });

      await page.waitForTimeout(1000);

      sfCom = await page.evaluate(
        (daysNum, dates) => {
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
        },
        daysNum,
        dates
      );
    } else {
      throw new Error('Surf-Forecast url is undefined');
    }

    await browser.close();

    // Organize output data
    const forecast = {};

    dates.forEach((date) => {
      forecast[date] = {
        msw: msw.forecast[date],
        wind: wind.forecast[date],
        sfCom: sfCom.forecast[date],
      };
    });

    const data = {
      spotName: spotUrls[0],
      region: spotUrls[1],
      // times: { msw: msw.times, wind: wind.times, sfCom: sfCom.times }, ----- Utility, now in separate file
      forecast,
    };

    console.log(data);

    // const timesJson = JSON.stringify(data.times);
    // fs.writeFileSync('src/api/utils/times.json', timesJson);
    // const tomorrowJson = JSON.stringify(data.forecast[dates[1]]);
    // fs.writeFileSync(`output/${data.spotName}-${dates[1]}.json`, tomorrowJson);
    // fs.writeFileSync(`output/data.json`, tomorrowJson);
    // const forecastJson = JSON.stringify(data.forecast);
    // fs.writeFileSync(`output/${data.spotName}-forecast.json`, forecastJson);

    return data;
  } catch (error) {
    console.log(error);
  }
}

// async function writeData(spots) {
//   const data = await getData(spots);
//   const forecastJson = JSON.stringify(data);

//   // Сохраняем старые данные

//   const toHtml = pug.renderFile('src/templates/index.pug', data);
//   fs.writeFileSync(`output/html/${data.spotName}.html`, toHtml);

//   fs.writeFileSync(`output/${data.spotName}.json`, forecastJson);

//   // const oldData = fs.readFileSync('output/data.json');
//   // fs.writeFileSync('output/data-backup.json', oldData);

//   // // Чистим файл

//   // fs.writeFileSync('output/data.json', '');

//   // Пишем старое

//   // fs.writeFileSync(`output/data.json`, oldData);

//   // let writer = fs.createWriteStream(`output/${data.spotName}.md`, {
//   //   flags: 'a'
//   // });

//   // Добавляем сверху новое

//   // writer.write('\n');
//   // writer.write('\n');
//   // writer.write(forecastJson);
// }

const spots = [
  [
    'TheCathedral',
    'Morocco',
    'https://www.windguru.cz/49304',
    'https://magicseaweed.com/Imsouane-Cathedral-Point-Surf-Report/990/',
    'https://www.surf-forecast.com/breaks/La-Cathedrale/forecasts/latest/six_day',
  ],
  [
    'AnchorPoint',
    'Morocco',
    'https://www.windguru.cz/549853',
    'https://magicseaweed.com/Anchor-Point-Surf-Report/905/',
    'https://www.surf-forecast.com/breaks/La-Pointedes-Ancres/forecasts/latest/six_day',
  ],
  [
    'Alanya',
    'Turkey (Mediterranian)',
    'https://www.windguru.cz/37745',
    'https://magicseaweed.com/Alanya-Surf-Report/4456/',
    'https://www.surf-forecast.com/breaks/Side-West-Beach/forecasts/latest/six_day',
  ],
];

getData(spots[1], 3);
