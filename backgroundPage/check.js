import { checkPageTags } from './tags.js'
import { adstxt } from "./adstxt.js"

// Contains three functions to get information in the form of an array
// from the script, head and body sections. After it has been completed
// the resulting arrays go inside evaluateTags.
function tags(url) {
    let fmtURL = new URL(url)
    checkPageTags(fmtURL.origin)
    if (fmtURL.pathname !== '/')
        checkPageTags(url)
}

export { adstxt, tags }