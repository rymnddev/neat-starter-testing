const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const { PDFDocument } = require('pdf-lib')
const { fromBuffer } = require('pdf2pic')
const fs = require('fs')
const path = require('path')


module.exports = function (eleventyConfig) {
  	eleventyConfig.setServerOptions({
		// Default values are shown:

		// Whether the live reload snippet is used
		liveReload: true,

		// Whether DOM diffing updates are applied where possible instead of page reloads
		domDiff: true,

		// The starting port number
		// Will increment up to (configurable) 10 times if a port is already in use.
		port: 8080,

		// Additional files to watch that will trigger server updates
		// Accepts an Array of file paths or globs (passed to `chokidar.watch`).
		// Works great with a separate bundler writing files to your output folder.
		// e.g. `watch: ["_site/**/*.css"]`
		watch: [],

		// Show local network IP addresses for device testing
		showAllHosts: false,

		// Use a local key/certificate to opt-in to local HTTP/2 with https
		https: {
			// key: "./localhost.key",
			// cert: "./localhost.cert",
		},

		// Change the default file encoding for reading/serving files
		encoding: "utf-8",

		// Show the dev server version number on the command line
		showVersion: false,

		// Added in Dev Server 2.0+
		// The default file name to show when a directory is requested.
		indexFileName: "index.html",

		// Added in Dev Server 2.0+
		// An object mapping a URLPattern pathname to a callback function
		// for on-request processing (read more below).
		onRequest: {},
	});

  // Disable automatic use of your .gitignore
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // human readable date
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "Australia/Sydney" }).toFormat(
      "dd LLL yyyy"
    );
  });

  eleventyConfig.addFilter("weekAndYear", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: "Australia/Sydney" }).toFormat(
      "WW, yyyy"
    );
  });

  // Syntax Highlighting for Code blocks
  eleventyConfig.addPlugin(syntaxHighlight);

  // To Support .yaml Extension in _data
  // You may remove this if you can use JSON
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  eleventyConfig.addWatchTarget("./src/static/css/")

  // Copy Static Files to /_Site
  eleventyConfig.addPassthroughCopy({
    "./src/admin/config.yml": "./admin/config.yml",
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
    "./node_modules/prismjs/themes/prism-tomorrow.css":
      "./static/css/prism-tomorrow.css",
      "./src/static/css/main.css": "./static/css/main.css",
      "./src/bulletin/*.pdf": "./archive"
  });

  // Copy Image Folder to /_site
  eleventyConfig.addPassthroughCopy("./src/static/img");


  // Copy favicon to route of /_site
  eleventyConfig.addPassthroughCopy("./src/favicon.ico");

  eleventyConfig.addAsyncShortcode("extractFirstPage", async function([path, name]) {
    const file = path+name
 
// file = { fileName: fileName, content: arraybuffer }
 
    const originalPdf = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true })
    const newPdf = await PDFDocument.create()
    const [firstPage] = await newPdf.copyPages(originalPdf, [0]) // <-- 0 is the first page
    newPdf.addPage(firstPage)
    const firstPagePdf = await newPdf.save()
    
    // file.content = Buffer.from(firstPagePdf)

    const imgFilePath = './src/static/img/pdf-thumbnails/'
    const imgFileName = [name.split('.pdf')[0], '.pdf.1.png'].join('')

    fs.access(imgFilePath + imgFileName, fs.constants.F_OK, (err) => {
      if (err) {
        console.log(err)
        const convert = fromBuffer(firstPagePdf, {
          density: 100,
          saveFilename: name,
          savePath: "./src/static/img/pdf-thumbnails",
          format: "png",
          width: 630,
          height: 891
        })

        convert(1, {
          responseType: "image"
        }).then((resolve) => {
          console.log('converted page 1, saved to:')
          console.log(imgFilePath + imgFileName)

          return resolve
        })
      } else {
        return true
      }
    })




    return '/static/img/pdf-thumbnails/' + name + '.1.png'
  })


  // Let Eleventy transform HTML files as nunjucks
  // So that we can use .html instead of .njk
  return {
    dir: {
      input: "src",
    },
    htmlTemplateEngine: "njk",
  };
};
