const { contextBridge, ipcRenderer } = require('electron');

// The same `api` shape is implemented for browsers in src/platform-web.js.
contextBridge.exposeInMainWorld('api', {
  platform: 'desktop',
  textEmbeds: 'ai/text-embeds.json',
  photoUrl: name => `/userdata/${encodeURIComponent(name)}`,
  loadDb: () => ipcRenderer.invoke('db:load'),
  saveDb: json => ipcRenderer.invoke('db:save', json),
  savePhoto: (bytes, ext) => ipcRenderer.invoke('photos:save', bytes, ext),
  removePhotos: names => ipcRenderer.invoke('photos:remove', names),
  embed: pixels => ipcRenderer.invoke('ai:embed', pixels),
  saveFile: (name, text) => ipcRenderer.invoke('file:save', name, text),
});
