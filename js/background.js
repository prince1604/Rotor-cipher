/* MV3 service worker — open the panel, hand off selected text. No engines. */

const HANDOFF = 'rotorHandOff';

function setPanelBehavior() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

function installMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'rotor.open',
      title: 'Open in Rotor',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'rotor.sha256',
      title: 'Rotor: SHA-256',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'rotor.b64',
      title: 'Rotor: Base64-encode',
      contexts: ['selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setPanelBehavior();
  installMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setPanelBehavior();
});

setPanelBehavior();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const prefer =
    info.menuItemId === 'rotor.sha256' ? 'sha-256' :
    info.menuItemId === 'rotor.b64' ? 'base64' :
    null;
  await chrome.storage.session.set({
    [HANDOFF]: {
      text: info.selectionText || '',
      prefer,
      t: Date.now(),
    },
  });
  const windowId = tab?.windowId;
  if (windowId != null) {
    try {
      await chrome.sidePanel.open({ windowId });
    } catch {
      // panel API can throw if the window is gone; ignore
    }
  }
});
