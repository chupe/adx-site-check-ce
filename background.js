chrome.runtime.onInstalled.addListener(() => {
  console.log("LuponMedia script started")
})

let getHostname = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let activeTabHostname = new URL(tabs[0].url).hostname
      return resolve(activeTabHostname)
    })
  })
}



// Pass to the function the information from the content script and the origin url so it can be
// saved in storage under publisher name key
let updateStorage = (update) => {
  return new Promise((resolve, reject) => {

    let publisher = Object.keys(update)[0]
    let newData = update[publisher]
    chrome.storage.sync.get(publisher, (data) => {
      let oldData = data[publisher]
      if (!oldData) {
        let json = {}
        json.name = publisher
        json[publisher] = newData
        chrome.storage.sync.set(json, () => {
          resolve()
        })
      } else {
        // Here the rest of the properties are iterated over and updated
        for (let info in newData) {
          // Do not update adUnits property
          if (info == 'adUnits')
            continue

          oldData[info] = newData[info]
        }

        //Ad units are an object inside an object and are iterated separately
        let oldAdUnits = oldData.adUnits
        let newAdUnits = newData.adUnits
        if (newAdUnits) {
          let homepageCheck = newData.homepageCheck
          let articleCheck = newData.articleCheck

          // Values for inHomepage and inArticle should be modified only if the
          // update homepageCheck = true or articleCheck = true
          if (oldAdUnits) {
            for (let adUnit in newAdUnits) {
              if (newAdUnits[adUnit]) {

                for (let details in newAdUnits[adUnit]) {
                  if (details == 'inHomepage' && !homepageCheck)
                    continue
                  if (details == 'inArticle' && !articleCheck)
                    continue

                  // If inScript has been set to true do not set it to
                  // false if in another context the script tags are not present
                  if (details == 'inScript' && oldAdUnits[adUnit][details])
                    continue
                  oldAdUnits[adUnit][details] = newAdUnits[adUnit][details]
                }
              }
            }
          } else {
            oldData.adUnits = newAdUnits
          }
        }

        let json = {}
        json[publisher] = oldData

        chrome.storage.sync.set(json, () => {
          resolve()
        })
      }
    })
  })
}

let showDetails = () => {

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let activeTabHostname = new URL(tabs[0].url).hostname

    chrome.storage.sync.get(activeTabHostname, (data) => {

      // The detailed information about the current site is displayed
      // inside extension console
      console.log(activeTabHostname, data[activeTabHostname])
    })
  })
}

// Script url is the url extracted in content, passed here in a message and the script body
// will be sent back to content as a response to that message.
let fetchScript = (scriptUrl, publisher) => {
  function reqListener() {
    let response = this.responseText
    if (response) {
      let json = {}
      json[publisher] = { script: response }
      updateStorage(json)
    }
  }

  let xhr = new XMLHttpRequest();
  xhr.open('GET', scriptUrl, true)
  xhr.responseType = 'text'
  xhr.addEventListener("loadend", reqListener)
  xhr.send()
}

let adstxt = (publisher) => {
  let origin = new URL(publisher).origin
  publisher = new URL(publisher).hostname
  let localAdstxt = ''
  let adstxt = ''
  let missingLines = []

  // The function loads static ads.txt from local folder, splits it into
  // an array at '\n' than splits it once more so that each comma in a line
  // is a split point. This way each comma separated value in each line can
  // be compared against another line that is generated in the same way but
  // originates from the activeTabUrl.origin /ads.txt
  let compareAdsTxt = () => {

    // Split lines first
    localAdstxt = localAdstxt.split('\n')
    adstxt = adstxt.split('\n')

    for (let localLine of localAdstxt) {
      let onSite = false

      // Skip line of comment
      if (localLine.charAt(0) === '#') continue

      // Each line is split into comma separated list (bidder name, publisher ID)
      // trimmed of spaces for consistency. Iterate over local ads.txt and try to
      // match it against the origin site ads.txt. If unable push missing lines
      // into a variable missingLines
      let localItems = localLine.split(',').map((item) => item.trim())
      for (let siteLine of adstxt) {
        let siteItems = siteLine.split(',').map((item) => item.trim())
        if (localItems[0] == siteItems[0] && localItems[1] == siteItems[1]) {
          onSite = true
        }
      }
      if (!onSite)
        missingLines.push(localLine)
    }

    let json = {}
    json[publisher] = { adstxtMissingLines: missingLines }
    updateStorage(json)
  }

  function reqListenerLocal() {
    localAdstxt = this.responseText
    onsite.send()
  }

  function reqListenerSite() {
    adstxt = this.responseText
    compareAdsTxt()
  }

  // Prepare local XHR, inside its request listener call the send()
  // for origin ads.txt.
  let local = new XMLHttpRequest()
  local.open("GET", './ads.txt')
  local.responseType = 'text'
  local.addEventListener("loadend", reqListenerLocal)
  local.send()

  // Remote send() is called from reqListenerLocal to make sure that
  // both adstxt and localAdsTxt are resolved before calling compare function
  console.log(origin)

  let hostAdsTxt = new URL(origin + '/ads.txt')
  let onsite = new XMLHttpRequest()
  onsite.open("GET", hostAdsTxt)
  onsite.responseType = 'text'
  onsite.addEventListener("loadend", reqListenerSite)
}

// Fill adunit.sizes. Regexp to match the sizes array, than to match
// individual size pair, parsed as ints and sorted according to surface area.
let extractSizes = (name) => {
  let scripts = document.scripts

  // Prepare adunit.name to be used inside regexp obj
  name = name.replace('.', '\\.')
  let regex = new RegExp("(?<=/" + name + "', ?\\[ ?).+(?= ?\\] ?, ?)", 'g')
  let sizes = ''
  for (let script of scripts) {

    // If there is a script and sizes array hasnt been populated yet
    if (script && !sizes) {
      sizes = script.textContent.match(regex)
      if (sizes) {
        let reg = new RegExp(", ?", 'g')

        // If ad unit has one size it does not have two pairs of braces,
        // and requires different approach to turn it into array of int
        if (!sizes[0].match(/\[[0-9]{3},[ ]*[0-9]{2,}\]/g)) {
          sizes = sizes[0].split(reg)
          sizes = [parseInt(sizes[0]), parseInt(sizes[1])]
          sizes = [sizes]
        } else {
          sizes = sizes[0].match(/\[[0-9]{3},[ ]*[0-9]{2,}\]/g)
          sizes = sizes.map((size) => {
            size = size.replace(/[\[ \])]?/g, '')
            size = size.split(reg)
            size[0] = parseInt(size[0])
            size[1] = parseInt(size[1])

            return size
          })

          // Sort according to surface area of an ad unit
          sizes.sort((a, b) => {
            return b[0] * b[1] - a[0] * a[1]
          })
        }
      }
    }
  }

  return sizes
}


// Returns an array of div-gpt tags from adxbid script
// unless parameter is missing. If so returns empty array
let tagsFromScript = (publisher) => {
  let scriptTags = ''
  chrome.storage.sync.get(publisher, (data) => {
    if (data[publisher] && data[publisher].script)
      scriptTags = script.match(/div-gpt-ad-[0-9]{13}-\d/g)
  })

  return scriptTags
}

// Returns an array of div-gpt tags from DOM body
let divsFromBody = () => {
  let bodyDivs = []
  let gptDivs = $("div[id^='div-gpt-ad-']")
  for (let tag of gptDivs) {
    bodyDivs.push(tag.id)
  }

  return bodyDivs
}

// Returns an array of div-gpt tags from DOM head
let tagsFromHead = () => {
  let headTags = []

  // Iterate over all scripts in the head and match id
  // and name
  for (let script of document.scripts) {
    if (script) {// && headTags.length == 0) {
      let tempIDs = []
      let tempNames = []
      let adUnitIDs = []
      let adUnitNames = []

      tempIDs = script.textContent.match(/div-gpt-ad-[0-9]{13}-\d{1,2}(?=')/g)
      if (tempIDs) {
        for (let ID of tempIDs)
          adUnitIDs.push(ID)
      }

      tempNames = script.textContent.match(/(?<=googletag.defineSlot\('\/[0-9]{7,}\/).+(?=',)/gi)
      if (tempNames) {
        for (let name of tempNames)
          adUnitNames.push(name)
      }

      if (adUnitIDs) {
        for (let i = 0; i < adUnitIDs.length; i++) {
          // If there are additional unnamed tags found in body
          // they will not be part of the adunitsinfo object
          if (!adUnitNames[i])
            continue
          // In rare cases when sizes array contains 'fluid'
          // the name isnt matched correctly. When this is the case
          // the name is substringed up to the first occurence of - ', marking
          // the end of actual adunit name
          if (adUnitNames[i].search("',") > -1)
            adUnitNames[i] = adUnitNames[i].substring(0, adUnitNames[i].search("',"))
          headTags.push({
            ID: adUnitIDs[i],
            name: adUnitNames[i]
          })
        }
      }

    }
  }

  return headTags
}

// Returns an array of objects containing info about each tag.
// Object keys are named by adunit names. The function iterates over
// headTags and compares with body and script arrays
let evaluateTags = (headTags, bodyDivs, scriptTags) => {
  let adUnitsInfo = {}
  for (let headTag of headTags) {
    let adUnitID = headTag.ID
    let adUnitName = headTag.name
    let adUnit = new AdUnit(adUnitID, adUnitName, originUrl.hostname)

    for (let scriptID of scriptTags) {
      if (adUnitID == scriptID)
        adUnit.inScript = true
    }

    for (let bodyID of bodyDivs) {
      if (adUnitID == bodyID && originUrl.pathname == '/')
        adUnit.inHomepage = true
      else if (adUnitID == bodyID && originUrl.pathname != '/')
        adUnit.inArticle = true
    }

    adUnit.sizes = extractSizes(adUnit.name)
    adUnitsInfo[adUnit.name] = adUnit
  }

  return adUnitsInfo
}

// Contains three functions to get information in the form of an array
// from the script, head and body sections. After it has been completed
// the resulting arrays go inside evaluateTags.
let checkTags = (publisher) => {
  let bodyDivs = divsFromBody()
  let headTags = tagsFromHead()
  let scriptTags = tagsFromScript(publisher)

  let adUnitsInfo = evaluateTags(headTags, bodyDivs, scriptTags)

  let publisherObj = new Publisher(publisher, adUnitsInfo)

  if (originUrl.pathname != '/')
    publisherObj.articleCheck = true
  else publisherObj.homepageCheck = true

  // Upon completion the adUnitsInfo object is passed to the background.js
  chrome.runtime.sendMessage({ command: 'publisher', publisher: publisherObj })

  adUnitsInfo = publisherObj.adUnits
}



class Publisher {
  constructor(name, adUnits) {
    this.adUnits = adUnits
    this.name = name

    if (originUrl.pathname == '/')
      this.homepageCheck = true
    else
      this.articleCheck = true
  }
  adstxtMissingLines
  articleCheck
  homepageCheck
  highlight
  adstxtCheck
}

class AdUnit {
  constructor(ID, name, publisher) {
    this.publisher = publisher
    this.name = name
    this.ID = ID
    this.inHomepage = false
    this.inArticle = false
    this.inScript = false
    this.sizes = []
  }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let publisher = new URL(sender.url).hostname
  console.log(message)

  switch (message.command) {
    case 'scriptUrl':
      fetchScript(message.url, message.publisher)
      break
    case 'updateStorage':
      let json = {}
      json[message.publisher] = message.update
      updateStorage(json).finally()
      break
    case 'showDetails':
      showDetails()
      break
    case 'adstxt':
      adstxt(message.url)
      break
    case 'checkTags':
      // checkTags(message.publisher).then(sendResponse('Check tags for publisher updated'))
      break
    default:
      sendResponse({ result: "Unrecognized message.command" })
  }

  // True needs to be returned in all message listeners in order to keep the message channel
  // open until a reponse is received
  return true
})