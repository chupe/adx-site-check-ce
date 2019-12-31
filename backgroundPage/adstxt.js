import * as utilities from "../common/utilities.js"
import * as storage from "../common/storage.js"

let adstxt = (publisher) => {
  let origin = new URL(publisher).origin
  publisher = new URL(publisher).hostname
  let hostAdsTxt = new URL(origin + '/ads.txt')
  let missingLines = []

  // The function loads static ads.txt from local folder, splits it into
  // an array at '\n' than splits it once more so that each comma in a line
  // is a split point. This way each comma separated value in each line can
  // be compared against another line that is generated in the same way but
  // originates from the activeTabUrl.origin /ads.txt
  let compareAdsTxt = (localAdstxt, adstxt) => {

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

    storage.update({
      name: publisher,
      adstxtMissingLines: missingLines,
      adstxtCheck: true
    })
  }

  Promise.all([utilities.fetchFromUrl('../common/ads.txt'), utilities.fetchFromUrl(hostAdsTxt)])
    .then(([res1, res2]) => {
      compareAdsTxt(res1.doc, res2.doc)
    }).catch((e) => {
      console.log(e)
    })
}

export { adstxt }