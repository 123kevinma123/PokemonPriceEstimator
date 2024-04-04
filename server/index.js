


const express = require("express");
const cors = require('cors');
const axios = require('axios');
const app = express();
const puppeteer = require('puppeteer');
app.use(cors());
const pokemon = require("pokemontcgsdk");
require('dotenv').config()
const apikey = process.env.APIKEY

pokemon.configure({apikey})

app.use(express.json());

app.get("/", (req, res) => {
    res.send("hello world");
});

app.post("/search", async (req, res) => {
    try {
        const dataRec = JSON.stringify(req.body)
        const parseData = dataRec.replace(/ /g, "+");
        const parseData11 = parseData.substring(11);
        const parseData2 = parseData11.substring(0, parseData11.length - 2);
        const browser = await puppeteer.launch();

        const page = await browser.newPage();
        await page.goto(`https://www.pokellector.com/search?criteria=${parseData2}`,{ waitUntil: 'domcontentloaded' });

        await page.waitForSelector('.cardresult');
        
        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('.cardresult');
            const data = [];
            items.forEach(item => {
                const title = item.querySelector(".detail .name a").textContent.trim();
                const setNumber = item.querySelector(".detail .set a").textContent.trim();
                let parts = setNumber.split("#");
                parts[0] = parts[0].substring(0, parts[0].length - 1);
                data.push({ title, set: parts[0], number: parts[1]});
            });
            return data;
        });
        await browser.close();
        
        //access API
        const apiUrl = "http://localhost:1234/api";
        for (let i = 0; i < results.length; i++) {
            let index = results[i].title.indexOf("(");
            if (index == -1) {
                index = results[i].title.length + 1;
            }
            const nameOnly = results[i].title.substring(0, index);
            
            const queryParams = new URLSearchParams({
                name: nameOnly,
                set: results[i].set,
                number: results[i].number
            });
            const dynamicUrl = `${apiUrl}?${queryParams}`;
            fetch(dynamicUrl)
            .then(response => response.json())
            .then(apiData => {
            // Process the API data as needed
            console.log('API data for', nameOnly, results[i].set, results[i].number, ':', apiData);
        })
        }
       
    } catch (error) {
        console.error('Error fetching pokellector data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get("/api", (req, res) => {
    const name = req.query.name;
    const set = '"' + req.query.set + '"';
    const number = req.query.number;
    //console.log(name)
    //console.log(set)
    //console.log(number)
    pokemon.card.all({q: `name:${name} set.name:${set} number:${number}` })
    .then(result => {
        res.json(result[0].images.large);
    })
})
app.get("/watch-count-search", async (req, res) => {
    try {
        const browser = await puppeteer.launch();

        const page = await browser.newPage();
        await page.goto('http://www.watchcount.com/completed.php?bkw=%22cynthia%22+%22sv82%22+%22psa10%22&bcat=0&bcts=&sfsb=Show+Me%21&csbin=all&cssrt=ts&bfw=1&bslr=&bnp=&bxp=#serp');

        await page.waitForSelector(".serptablecell2-adv");
        
        const results = await page.evaluate(() => {
            const items = document.querySelectorAll(".serptablecell2-adv");
            const data = [];
            items.forEach(item => {
                const title = item.querySelector(".valtitle.lovewrap.padr4 > span > a").textContent.trim();
                const endTime = item.querySelector(".splittablecell1 .bhserp-dim2").textContent.trim();
                const price = item.querySelector(".splittablecell1 .bhserp-new1").textContent.trim();
                const url = item.querySelector(".underlinedlinks").href;
                data.push({ title, endTime, price, url });
            });
            return data;
        });
        await browser.close();
        const processed_data = [];
        for (let i = 0; i < results.length; i++) {
            const resultStr = results[i].title.toString();
            if (resultStr.toLowerCase().includes("psa 10") && 
                ! resultStr.toLowerCase().includes("japanese")
            ) {
                processed_data.push(results[i]);
            }
        }
        //console.log(processed_data.length);
        res.json(processed_data);
    } catch (error) {
        console.error('Error fetching watch count data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/ebay-search', async (req, res) => {
    try {
        const browser = await puppeteer.launch();

        const page = await browser.newPage();

        await page.goto('https://www.ebay.com/sch/i.html?_from=R40&_nkw=%22cynthia%22+%22sv82%22+&_sacat=0&_ipg=240');
        
        await page.waitForSelector('.s-item');
        
        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('.s-item');
            const data = [];
            items.forEach(item => {
                const title = item.querySelector(".s-item__title").textContent.trim();
                const price = item.querySelector(".s-item__price").textContent.trim();
                const url = item.querySelector(".s-item__link").href;
                data.push({ title, price, url });
            });
            return data;
        });
        await browser.close();
        console.log(results.length);
        const processed_data = [];
        //filter results here 
        for (let i = 1; i < results.length; i++) {
            const resultStr = results[i].title.toString();
            if (resultStr.toLowerCase().includes("psa 10") && 
                ! resultStr.toLowerCase().includes("japanese")
            ) {
                processed_data.push(results[i]);
            }
        }
        console.log(processed_data.length);
        res.json(processed_data);
    } catch (error) {
        console.error('Error fetching eBay data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

  
  app.listen(1234);