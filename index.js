const cheerio = require('cheerio');
const needle = require('needle');
const fs = require("fs");

const Words = require('./data/word.js');

const errWord = [];

function getData(url) {
	return new Promise((resolve, reject) => {
		needle.get('http://xh.5156edu.com' + url, {encoding:'gb2312'}, (error, response, body) => {
			if (error) {
				console.error(url);
				reject(error);
			} else {
				resolve(cheerio.load(body));
			}
		});
	});
}

function writeFile(fileData, fileName) {
	fs.writeFileSync(fileName, fileData);
}

async function getBushou() {
	const $ = await getData('/bs.html');

	let bushouData = [];

	const $table1 = $($('table[id="table1"]')[2]);

	$table1.find('tr').each(function() {
		const $td = $('td', this);

		const bihua = $($td[0]).text().replace(/[：\n\r]/g, '');
		const wordList = [];

		$('a', $td[1]).each(function() {
			const $a = $(this);
			wordList.push({
				url: '/' + $a.attr('href'),
				word: $a.text().replace(/[\n\r]/g, ''),
				bihua,
			});
		});

		bushouData = bushouData.concat(wordList);
	});

	return Promise.resolve(bushouData);
}

async function getPinyin() {
	const $ = await getData('/pinyi.html');

	let pinyinData = [];

	const $table1 = $($('table[id="table1"]').get(2));

	$table1.find('tr').each(function() {
		const $td = $('td', this);

		const word = $($td[0]).text().replace(/[\n\r]/g, '');
		const pinyinList = [];

		$('a', $td[1]).each(function() {
			const $a = $(this);
			pinyinList.push({
				url: '/' + $a.attr('href'),
				pinyin: $a.text().replace(/[\n\r]/g, ''),
				word,
			});
		});

		pinyinData = pinyinData.concat(pinyinList);
	});

	return Promise.resolve(pinyinData);
}

async function getBushouWord(bushouData) {
	let wordData = [];

	const getWord = async (data) => {
		const $ = await getData(data.url);

		const wordList = [];

		const $table = $($('table[id="table1"]').get(1)).next('table');

		$table.find('a').each(function() {
			const $a = $(this);
			const $py = $a.find('span');
			const url = $a.attr('href');
			const py = $py.text().trim();
			$py.remove();
			const word = $a.text().trim();
			
			const w = escape(word);
			if (w.indexOf('%uFFF') === 0) {
				const ew = {
					bs: data.word,
					py,
					bihua: parseInt($($a.closest('tr').find('td')[0]).text(), 10),
					url,
				}
				errWord.push(ew);
			} else {
				wordList.push({word, url});
			}
		});

		return Promise.resolve(wordList);
	};

	for (let i = 0; i < bushouData.length; i++) {
		const list = await getWord(bushouData[i]);
		wordData = wordData.concat(list);

		// if (i == 0) break;
	}

	return Promise.resolve(wordData);
}

function delay(sec) {
	return new Promise((resolve) => {
		sec = sec || 1;
		const time = sec * 1000;
		setTimeout(() => {
			resolve();
		}, time);
	})
}

async function getAllWord() {
	const allWord = [];

	const getWord = async (data, idx) => {
		await delay(1);

		let $ = null;

		try {
			$ = await getData(data.url);
		} catch(error) {
			console.log(`>> get data error [${idx}] --------------`);
			console.log('>> ' + JSON.stringify(data));
			return Promise.resolve(null);
		}

		try {
			const $base = $($('table[id="table1"]')[1]);
			const $intro = $base.closest('tr').next('tr').find('table');

			const word = $base.find('td.font_22').text();

			const $baseTb = $($base.find('table')[0]);
			const $tr = $baseTb.find('tr');
			const $td1 = $('td', $tr[0]);
			const $td2 = $('td', $tr[1]);

			const $pinyin = $($td1[1]);

			const pinyin = $pinyin.text().replace(/\s/g, '').split(',').filter((item) => item != '');
			const bihua = parseInt($($td1[3]).text() || 0, 10);
			const bushou = $($td2[1]).text() || '';
			const wubi = $($td2[3]).text() || '';

			const pronunciation = [];
			$pinyin.find('script').each(function() {
				pronunciation.push($(this).html().replace(/^(.*?)"(.*?)"(.*?)$/g, function($0, $1, $2){return $2}));
			});

			const intro = $intro.find('td.font_18').html().split(/\<hr class="?hr1"?\>/);
			let explanation = intro[1];
			let more = intro[2];

			explanation = explanation.replace(/\<b\>(.*?)\<\/b\>/g, '');
			explanation = explanation.replace(/[\n\r]/g, '');
			explanation = explanation.replace(/\s*\<br\>/g, '\n');
			explanation = $('<div>' + explanation + '</div>').text();
			explanation = explanation.slice(0, -1);

			more = more.replace(/\<b\>(.*?)\<\/b\>/g, '');
			more = more.replace(/[\n\r]/g, '');
			more = more.replace(/\s*\<br\>/g, '\n');
			more = $('<div>' + more + '</div>').text();
			more = more.slice(0, -1);
			if (more.replace(/\n/g, '') === '') {
				more = '';
			}

			return Promise.resolve({word, pinyin, pronunciation, bihua, bushou, wubi, explanation, more});
		} catch(error) {
			console.log(`>> format data error [${idx}] --------------`);
			console.log('>> ' + JSON.stringify(data));
			return Promise.resolve(null);
		}
	};

	for (let i = 0; i < Words.length; i++) {
		const wordData = await getWord(Words[i], i);

		if (wordData) {
			allWord.push(wordData);
		}

		// if (i == 9) break;
	}

	return Promise.resolve(allWord);
}

async function main() {
	// const bushouData = await getBushou();
	// writeFile(JSON.stringify(bushouData.map((item) => {
	// 	return {
	// 		word: item.word,
	// 		bihua: item.bihua,
	// 	};
	// }), null, 2), './data/bushou.json');

	// const pinyinData = await getPinyin();
	// writeFile(JSON.stringify(pinyinData.map((item) => {
	// 	return {
	// 		word: item.word,
	// 		pinyin: item.pinyin,
	// 	};
	// }), null, 2), './data/pinyin.json');

	// const wordData = await getBushouWord(bushouData);
	// writeFile(JSON.stringify(wordData, null, 2), './data/word.json');
	// writeFile(JSON.stringify(errWord, null, 2), './data/word_error.json');

	// const allWord = await getAllWord();
	// writeFile(JSON.stringify(allWord, null, 2), 'word.json');
	
	// console.log(allWord);

	console.log('>> done ===================' + (new Date()).toLocaleString());
}

console.log('>> start =================== ' + (new Date()).toLocaleString());

main();
