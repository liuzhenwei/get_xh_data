const request = require('request');
const fs = require('fs');

const Pinyin = require('./pinyin.js');

const domain = 'http://xh.5156edu.com/xhzdmp3abc/';

function delay(sec) {
	return new Promise((resolve) => {
		sec = sec || 1;
		const time = sec * 1000;
		setTimeout(() => {
			resolve();
		}, time);
	})
}

async function main() {
  const getMp3 = (mp3) => {
    mp3 = mp3 + '.mp3';
    const url = domain + mp3;
    return new Promise((resolve) => {
      request
        .get(url)
        .on('error', (err) => {
          console.error(`>> error: ${mp3} [${err.message || '未知'}]`);
          resolve();
        })
        .on('response', function(response) {
          if (response.statusCode === 404) {
            console.error(`>> error: ${mp3} [404]`);
            resolve();
          } else {
            this.pipe(fs.createWriteStream('./' + mp3).on('finish', () => resolve()));
          }
        });
    });
  };

	for (let i = 0; i < Pinyin.length; i++) {
    await delay(0.5);
		await getMp3(Pinyin[i].pinyin + '1');
    await delay(0.5);
		await getMp3(Pinyin[i].pinyin + '2');
    await delay(0.5);
		await getMp3(Pinyin[i].pinyin + '3');
    await delay(0.5);
    await getMp3(Pinyin[i].pinyin + '4');

    // if (i === 2) break;
	}

  console.log('>> done ============= ' + new Date().toLocaleString());
}

console.log('>> start ============= ' + new Date().toLocaleString());

main();
