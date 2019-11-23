chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ hide: true }, function () {
    console.log("LuponMedia script started");
  });
});

chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostContains: 'promotor.mk' },
    })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

