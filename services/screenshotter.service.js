const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin())

async function TVscreenshot(exchange, market, timeframe, theme = "dark") {
    // 1. Launch the browser and set the resolution
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
        defaultViewport: {
            // 4k resolution
            width: 1024,
            height: 720,
            isLandscape: true
        }
    });
    const name = `./screenshots/TV_${Date.now()}_${exchange}_${market}_${timeframe}.jpg`;

    // set the right timeframe
    timeframe = timeframe.toUpperCase();
    switch (timeframe) {
        case "1h":
            timeframe = "60";
            break;
        case "2h":
            timeframe = "120";
            break;
        case "4h":
            timeframe = "240";
            break;
        case "1d":
        case "daily":
            timeframe = "D";
            break;
        case "1w":
        case "week":
        case "weekly":
            timeframe = "W";
            break;
    }

    // 2. Open a new page
    const page = (await browser.pages())[0];
    await page.setContent(`
<div class="tradingview-widget-container">
  <div id="tradingview_31c43"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
  <script type="text/javascript">
  new TradingView.widget(
  {
  "autosize": true,
  "symbol": "${exchange}:${market}",
  "interval": "${timeframe}",
  "timezone": "Etc/UTC",
  "theme": "${theme}",
  "style": "1",
  "locale": "en",
  "hide_top_toolbar": true,
  "toolbar_bg": "#f1f3f6",
  "enable_publishing": false,
  "allow_symbol_change": true,
  "container_id": "tradingview_31c43"
}
  );
  </script>
</div>
    `);

    // 3. wait for the selector
    await page.waitForSelector("#tradingview_31c43 > div");
    const selection = await page.$("#tradingview_31c43");

    // delay to load everything
    await page.waitForTimeout(1000);

    // 4. Take screenshot
    await selection.screenshot({
        path: name,
        type: "jpeg",
        fullPage: false
    });

    // 5. Close the page and browser
    await page.close();
    await browser.close();

    return name;
}

module.exports = { TVscreenshot }