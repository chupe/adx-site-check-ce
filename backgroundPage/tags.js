import { AdUnit, Publisher } from './entities.js'
import * as utilities from '../common/utilities.js'
import * as storage from '../common/storage.js'

// Get ad units information from the page source code
let matchSourceInfo = async function (sourceCode, hostname) {
    let adUnitIDs = []
    let adUnitNames = []
    let adUnitSizes = []
    let headTags = []

    // Retrive data and extract information to be a reference
    // for script and body tags
    let data = await storage.getTabInfo(hostname)
    let adUnits = data.adUnits
    for (let adUnit in adUnits) {
        adUnitIDs.push(adUnits[adUnit].ID)
        adUnitNames.push(adUnits[adUnit].name)
        adUnitSizes.push(adUnits[adUnit].sizes)
    }

    // Get rid of HTML comments
    sourceCode = sourceCode.replace(/<!--[\s\S]*?-->/gi, '')

    if (adUnitIDs) {
        for (let i = 0; i < adUnitIDs.length; i++) {

            // In rare cases when sizes array contains 'fluid'
            // the name isnt matched correctly. When this is the case
            // the name is substringed up to the first occurence of - ', marking
            // the end of actual adunit name
            if (adUnitNames[i].search("',") > -1)
                adUnitNames[i] = adUnitNames[i].substring(0, adUnitNames[i].search("',"))
            headTags.push({
                ID: adUnitIDs[i],
                name: adUnitNames[i],
                sizes: adUnitSizes[i]
            })
        }
    }

    let bodyDivs = []

    for (let ID of adUnitIDs) {
        let reg = new RegExp(`(?<=<div.+id= ?["'])` + ID + `(?=["'])`, 'gi')
        let tempID = sourceCode.match(reg)
        if (tempID)
            bodyDivs.push(tempID[0])
    }

    let htmlTags = {
        headTags: headTags,
        bodyDivs: bodyDivs
    }

    return htmlTags
}

// Get script url as an array from the source code of the page
let getScriptUrl = async (sourceCode) => {
    let hostname = await utilities.getHostname()
    let scriptUrl = sourceCode.match(/https:\/\/adxbid\.(info|me)\/[\S]+\.js/gi)
    storage.update({
        name: hostname,
        scripts: scriptUrl
    })
    if (Array.isArray(scriptUrl))
        return scriptUrl[0]
    else return scriptUrl
}

// Get page source code, get adx script url from the source then get
// script from the url found and finally get
// ad units information from the page source code and the script source
let tagsFromSources = (pageUrl) => {
    let url = new URL(pageUrl)

    return utilities.fetchFromUrl(url)
        .then(
            async (sourceCode) => {
                let scriptUrl = await getScriptUrl(sourceCode.doc)
                let scriptSource

                if (scriptUrl) {
                    let { doc, url } = await utilities.fetchFromUrl(scriptUrl).catch((e) => console.log(e))
                    scriptSource = doc
                }

                return {
                    sourceCode: sourceCode.doc,
                    scriptSource,
                    hostname: new URL(pageUrl).hostname
                }
            })
        .then(
            async (sources) => {
                let { sourceCode, scriptSource, hostname } = sources
                let { headTags, bodyDivs } = await matchSourceInfo(sourceCode, hostname)
                let scriptTags

                if (scriptSource) {
                    scriptTags = scriptSource.match(/(?<=code: ?')div-gpt-ad-\d{13}-\d{1,2}(?=')/g)
                    if (!scriptTags)
                        console.log('No tags found in the script')
                } else
                    console.log('Script can\'t be downloaded from the url provided')

                return {
                    headTags,
                    bodyDivs,
                    scriptTags
                }
            }
        )
}

// Returns an array of objects containing info about each tag.
// Object keys are named by adunit names. The function iterates over
// headTags and compares with body and script arrays
let evaluateTags = (headTags, bodyDivs, scriptTags, publisher, section) => {
    let adUnitsInfo = {}
    for (let headTag of headTags) {
        let adUnitID = headTag.ID
        let adUnitName = headTag.name
        let adUnit = new AdUnit(adUnitID, adUnitName, publisher)

        adUnit.sizes = headTag.sizes

        if (utilities.isIterable(scriptTags))
            for (let scriptID of scriptTags) {
                if (adUnitID == scriptID)
                    adUnit.inScript = true
            }

        if (utilities.isIterable(bodyDivs))
            for (let bodyID of bodyDivs) {
                if (adUnitID == bodyID)
                    adUnit.setSection(section)
            }

        adUnitsInfo[adUnit.name] = adUnit
    }

    if (utilities.hasProperties(adUnitsInfo))
        return adUnitsInfo
    else
        return undefined
}

let checkPageTags = async (url) => {
    let fmtURL = new URL(url)
    let publisher = fmtURL.hostname
    let { headTags, bodyDivs, scriptTags } = await tagsFromSources(url)

    let publisherObj = new Publisher(publisher)

    let section = ''

    // If the page url has a path it is treated as an article,
    // else it is considered a homepage
    if (fmtURL.pathname != '/') {
        section = 'article'
        publisherObj.articleCheck = true
    }
    else {
        section = 'homepage'
        publisherObj.homepageCheck = true
    }
    let adUnitsInfo = evaluateTags(headTags, bodyDivs, scriptTags, publisher, section)

    publisherObj.adUnits = adUnitsInfo

    storage.update(publisherObj)
}

export { checkPageTags }