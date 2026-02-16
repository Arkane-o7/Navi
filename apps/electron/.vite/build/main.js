"use strict";
const require$$7 = require("electron");
const path = require("path");
const require$$2 = require("node:assert");
const require$$3 = require("node:fs");
const require$$4 = require("node:os");
const require$$5 = require("node:path");
const require$$6 = require("node:util");
const child_process = require("child_process");
var dist = {};
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name2) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name2 + (isPlural ? "s" : "");
  }
  return ms;
}
var isUrl_1;
var hasRequiredIsUrl;
function requireIsUrl() {
  if (hasRequiredIsUrl) return isUrl_1;
  hasRequiredIsUrl = 1;
  isUrl_1 = isUrl;
  var protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;
  var localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
  var nonLocalhostDomainRE = /^[^\s\.]+\.\S{2,}$/;
  function isUrl(string) {
    if (typeof string !== "string") {
      return false;
    }
    var match = string.match(protocolAndDomainRE);
    if (!match) {
      return false;
    }
    var everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) {
      return false;
    }
    if (localhostDomainRE.test(everythingAfterProtocol) || nonLocalhostDomainRE.test(everythingAfterProtocol)) {
      return true;
    }
    return false;
  }
  return isUrl_1;
}
var commonjs;
var hasRequiredCommonjs;
function requireCommonjs() {
  if (hasRequiredCommonjs) return commonjs;
  hasRequiredCommonjs = 1;
  var isUrl = requireIsUrl();
  var laxUrlRegex = /(?:(?:[^:]+:)?[/][/])?(?:.+@)?([^/]+)([/][^?#]+)/;
  commonjs = function(repoUrl, opts) {
    var obj = {};
    opts = opts || {};
    if (!repoUrl) {
      return null;
    }
    if (repoUrl.url) {
      repoUrl = repoUrl.url;
    }
    if (typeof repoUrl !== "string") {
      return null;
    }
    var shorthand = repoUrl.match(/^([\w-_]+)\/([\w-_\.]+)(?:#([\w-_\.]+))?$/);
    var mediumhand = repoUrl.match(/^github:([\w-_]+)\/([\w-_\.]+)(?:#([\w-_\.]+))?$/);
    var antiquated = repoUrl.match(/^git@[\w-_\.]+:([\w-_]+)\/([\w-_\.]+)$/);
    if (shorthand) {
      obj.user = shorthand[1];
      obj.repo = shorthand[2];
      obj.branch = shorthand[3] || "master";
      obj.host = "github.com";
    } else if (mediumhand) {
      obj.user = mediumhand[1];
      obj.repo = mediumhand[2];
      obj.branch = mediumhand[3] || "master";
      obj.host = "github.com";
    } else if (antiquated) {
      obj.user = antiquated[1];
      obj.repo = antiquated[2].replace(/\.git$/i, "");
      obj.branch = "master";
      obj.host = "github.com";
    } else {
      repoUrl = repoUrl.replace(/^git\+/, "");
      if (!isUrl(repoUrl)) {
        return null;
      }
      var ref = repoUrl.match(laxUrlRegex) || [];
      var hostname = ref[1];
      var pathname = ref[2];
      if (!hostname) {
        return null;
      }
      if (hostname !== "github.com" && hostname !== "www.github.com" && !opts.enterprise) {
        return null;
      }
      var parts = pathname.match(/^\/([\w-_]+)\/([\w-_\.]+)(\/tree\/[\%\w-_\.\/]+)?(\/blob\/[\%\w-_\.\/]+)?/);
      if (!parts) {
        return null;
      }
      obj.user = parts[1];
      obj.repo = parts[2].replace(/\.git$/i, "");
      obj.host = hostname || "github.com";
      if (parts[3] && /^\/tree\/master\//.test(parts[3])) {
        obj.branch = "master";
        obj.path = parts[3].replace(/\/$/, "");
      } else if (parts[3]) {
        var branchMatch = parts[3].replace(/^\/tree\//, "").match(/[\%\w-_.]*\/?[\%\w-_]+/);
        obj.branch = branchMatch && branchMatch[0];
      } else if (parts[4]) {
        var branchMatch = parts[4].replace(/^\/blob\//, "").match(/[\%\w-_.]*\/?[\%\w-_]+/);
        obj.branch = branchMatch && branchMatch[0];
      } else {
        obj.branch = "master";
      }
    }
    if (obj.host === "github.com") {
      obj.apiHost = "api.github.com";
    } else {
      obj.apiHost = obj.host + "/api/v3";
    }
    obj.tarball_url = "https://" + obj.apiHost + "/repos/" + obj.user + "/" + obj.repo + "/tarball/" + obj.branch;
    obj.clone_url = "https://" + obj.host + "/" + obj.user + "/" + obj.repo;
    if (obj.branch === "master") {
      obj.https_url = "https://" + obj.host + "/" + obj.user + "/" + obj.repo;
      obj.travis_url = "https://travis-ci.org/" + obj.user + "/" + obj.repo;
      obj.zip_url = "https://" + obj.host + "/" + obj.user + "/" + obj.repo + "/archive/master.zip";
    } else {
      obj.https_url = "https://" + obj.host + "/" + obj.user + "/" + obj.repo + "/blob/" + obj.branch;
      obj.travis_url = "https://travis-ci.org/" + obj.user + "/" + obj.repo + "?branch=" + obj.branch;
      obj.zip_url = "https://" + obj.host + "/" + obj.user + "/" + obj.repo + "/archive/" + obj.branch + ".zip";
    }
    if (obj.path) {
      obj.https_url += obj.path;
    }
    obj.api_url = "https://" + obj.apiHost + "/repos/" + obj.user + "/" + obj.repo;
    return obj;
  };
  return commonjs;
}
const name = "update-electron-app";
const version = "3.1.2";
const require$$8 = {
  name,
  version
};
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist;
  hasRequiredDist = 1;
  var __importDefault = dist && dist.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(dist, "__esModule", { value: true });
  dist.UpdateSourceType = void 0;
  dist.updateElectronApp = updateElectronApp;
  dist.makeUserNotifier = makeUserNotifier;
  const ms_1 = __importDefault(requireMs());
  const github_url_to_object_1 = __importDefault(requireCommonjs());
  const node_assert_1 = __importDefault(require$$2);
  const node_fs_1 = __importDefault(require$$3);
  const node_os_1 = __importDefault(require$$4);
  const node_path_1 = __importDefault(require$$5);
  const node_util_1 = require$$6;
  const electron_1 = require$$7;
  var UpdateSourceType;
  (function(UpdateSourceType2) {
    UpdateSourceType2[UpdateSourceType2["ElectronPublicUpdateService"] = 0] = "ElectronPublicUpdateService";
    UpdateSourceType2[UpdateSourceType2["StaticStorage"] = 1] = "StaticStorage";
  })(UpdateSourceType || (dist.UpdateSourceType = UpdateSourceType = {}));
  const pkg = require$$8;
  const userAgent = (0, node_util_1.format)("%s/%s (%s: %s)", pkg.name, pkg.version, node_os_1.default.platform(), node_os_1.default.arch());
  const supportedPlatforms = ["darwin", "win32"];
  const isHttpsUrl = (maybeURL) => {
    try {
      const { protocol } = new URL(maybeURL);
      return protocol === "https:";
    } catch (_a) {
      return false;
    }
  };
  function updateElectronApp(opts = {}) {
    const safeOpts = validateInput(opts);
    if (!electron_1.app.isPackaged) {
      const message = "update-electron-app config looks good; aborting updates since app is in development mode";
      if (opts.logger) {
        opts.logger.log(message);
      } else {
        console.log(message);
      }
      return;
    }
    if (electron_1.app.isReady()) {
      initUpdater(safeOpts);
    } else {
      electron_1.app.on("ready", () => initUpdater(safeOpts));
    }
  }
  function initUpdater(opts) {
    const { updateSource, updateInterval, logger: logger2 } = opts;
    if (!supportedPlatforms.includes(process === null || process === void 0 ? void 0 : process.platform)) {
      log(`Electron's autoUpdater does not support the '${process.platform}' platform. Ref: https://www.electronjs.org/docs/latest/api/auto-updater#platform-notices`);
      return;
    }
    let feedURL;
    let serverType = "default";
    switch (updateSource.type) {
      case UpdateSourceType.ElectronPublicUpdateService: {
        feedURL = `${updateSource.host}/${updateSource.repo}/${process.platform}-${process.arch}/${electron_1.app.getVersion()}`;
        break;
      }
      case UpdateSourceType.StaticStorage: {
        feedURL = updateSource.baseUrl;
        if (process.platform === "darwin") {
          feedURL += "/RELEASES.json";
          serverType = "json";
        }
        break;
      }
    }
    const requestHeaders = { "User-Agent": userAgent };
    function log(...args) {
      logger2.log(...args);
    }
    log("feedURL", feedURL);
    log("requestHeaders", requestHeaders);
    electron_1.autoUpdater.setFeedURL({
      url: feedURL,
      headers: requestHeaders,
      serverType
    });
    electron_1.autoUpdater.on("error", (err) => {
      log("updater error");
      log(err);
    });
    electron_1.autoUpdater.on("checking-for-update", () => {
      log("checking-for-update");
    });
    electron_1.autoUpdater.on("update-available", () => {
      log("update-available; downloading...");
    });
    electron_1.autoUpdater.on("update-not-available", () => {
      log("update-not-available");
    });
    if (opts.notifyUser) {
      electron_1.autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
        log("update-downloaded", [event, releaseNotes, releaseName, releaseDate, updateURL]);
        if (typeof opts.onNotifyUser !== "function") {
          (0, node_assert_1.default)(opts.onNotifyUser === void 0, "onNotifyUser option must be a callback function or undefined");
          log("update-downloaded: notifyUser is true, opening default dialog");
          opts.onNotifyUser = makeUserNotifier();
        } else {
          log("update-downloaded: notifyUser is true, running custom onNotifyUser callback");
        }
        opts.onNotifyUser({
          event,
          releaseNotes,
          releaseDate,
          releaseName,
          updateURL
        });
      });
    }
    electron_1.autoUpdater.checkForUpdates();
    setInterval(() => {
      electron_1.autoUpdater.checkForUpdates();
    }, (0, ms_1.default)(updateInterval));
  }
  function makeUserNotifier(dialogProps) {
    const defaultDialogMessages = {
      title: "Application Update",
      detail: "A new version has been downloaded. Restart the application to apply the updates.",
      restartButtonText: "Restart",
      laterButtonText: "Later"
    };
    const assignedDialog = Object.assign({}, defaultDialogMessages, dialogProps);
    return (info) => {
      const { releaseNotes, releaseName } = info;
      const { title, restartButtonText, laterButtonText, detail } = assignedDialog;
      const dialogOpts = {
        type: "info",
        buttons: [restartButtonText, laterButtonText],
        title,
        message: process.platform === "win32" ? releaseNotes : releaseName,
        detail
      };
      electron_1.dialog.showMessageBox(dialogOpts).then(({ response }) => {
        if (response === 0) {
          electron_1.autoUpdater.quitAndInstall();
        }
      });
    };
  }
  function guessRepo() {
    var _a;
    const pkgBuf = node_fs_1.default.readFileSync(node_path_1.default.join(electron_1.app.getAppPath(), "package.json"));
    const pkg2 = JSON.parse(pkgBuf.toString());
    const repoString = ((_a = pkg2.repository) === null || _a === void 0 ? void 0 : _a.url) || pkg2.repository;
    const repoObject = (0, github_url_to_object_1.default)(repoString);
    (0, node_assert_1.default)(repoObject, "repo not found. Add repository string to your app's package.json file");
    return `${repoObject.user}/${repoObject.repo}`;
  }
  function validateInput(opts) {
    var _a;
    const defaults = {
      host: "https://update.electronjs.org",
      updateInterval: "10 minutes",
      logger: console,
      notifyUser: true
    };
    const { host, updateInterval, logger: logger2, notifyUser, onNotifyUser } = Object.assign({}, defaults, opts);
    let updateSource = opts.updateSource;
    if (!updateSource) {
      updateSource = {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: opts.repo || guessRepo(),
        host
      };
    }
    switch (updateSource.type) {
      case UpdateSourceType.ElectronPublicUpdateService: {
        (0, node_assert_1.default)((_a = updateSource.repo) === null || _a === void 0 ? void 0 : _a.includes("/"), "repo is required and should be in the format `owner/repo`");
        if (!updateSource.host) {
          updateSource.host = host;
        }
        (0, node_assert_1.default)(updateSource.host && isHttpsUrl(updateSource.host), "host must be a valid HTTPS URL");
        break;
      }
      case UpdateSourceType.StaticStorage: {
        (0, node_assert_1.default)(updateSource.baseUrl && isHttpsUrl(updateSource.baseUrl), "baseUrl must be a valid HTTPS URL");
        break;
      }
    }
    (0, node_assert_1.default)(typeof updateInterval === "string" && updateInterval.match(/^\d+/), "updateInterval must be a human-friendly string interval like `20 minutes`");
    (0, node_assert_1.default)((0, ms_1.default)(updateInterval) >= 5 * 60 * 1e3, "updateInterval must be `5 minutes` or more");
    (0, node_assert_1.default)((0, ms_1.default)(updateInterval) < 2 ** 31, "updateInterval must fit in a signed 32-bit integer");
    (0, node_assert_1.default)(logger2 && typeof logger2.log, "function");
    return { updateSource, updateInterval, logger: logger2, notifyUser, onNotifyUser };
  }
  return dist;
}
requireDist();
const isDevelopment = typeof process !== "undefined" && process.env.NODE_ENV === "development";
const logger = {
  debug: (...args) => {
    if (isDevelopment) console.debug(...args);
  },
  info: (...args) => {
    if (isDevelopment) console.info(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  }
};
if (process.platform === "win32") {
  try {
    const started = require("electron-squirrel-startup");
    if (started) {
      require$$7.app.quit();
    }
  } catch (e) {
  }
}
const PROTOCOL = "navi";
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    require$$7.app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  require$$7.app.setAsDefaultProtocolClient(PROTOCOL);
}
const isMac = process.platform === "darwin";
const SHORTCUT = isMac ? "Command+`" : "Alt+`";
const SETTINGS_SHORTCUT = isMac ? "Command+." : "Alt+.";
require$$7.app.setName("Navi");
function getNaviIconPath() {
  return require$$7.app.isPackaged ? path.join(process.resourcesPath, "assets", "icon.png") : path.join(__dirname, "../../assets/icon.png");
}
async function showDockWithNaviIcon() {
  if (!isMac) return;
  await require$$7.app.dock.show();
  try {
    const icon = require$$7.nativeImage.createFromPath(getNaviIconPath());
    if (!icon.isEmpty()) {
      require$$7.app.dock.setIcon(icon);
      logger.debug("[Navi] Dock icon set successfully");
    } else {
      logger.error("[Navi] Dock icon image is empty");
    }
  } catch (err) {
    logger.error("[Navi] Failed to set dock icon:", err);
  }
}
let flowWindow = null;
let dockedWindow = null;
let settingsWindow = null;
let tray = null;
let isDocked = false;
let dockSide = "right";
let dockedSize = { width: 420, height: 0 };
let dockTransitionUntil = 0;
function tileOtherWindows(remainingBounds) {
  if (!isMac) return;
  const { x, y, width, height } = remainingBounds;
  const script = `
    tell application "System Events"
      set allProcs to every process whose visible is true and name is not "Navi" and name is not "Electron"
      repeat with proc in allProcs
        try
          set procName to name of proc
          -- Skip menu bar apps and system processes
          if (count of windows of proc) > 0 then
            tell application procName
              repeat with win in every window
                try
                  set bounds of win to {${x}, ${y}, ${x + width}, ${y + height}}
                end try
              end repeat
            end tell
          end if
        end try
      end repeat
    end tell
  `;
  child_process.execFile("osascript", ["-e", script], (err) => {
    if (err) {
      logger.error("[Navi] Failed to tile other windows:", err.message);
    } else {
      logger.debug("[Navi] Tiled other windows to remaining space");
    }
  });
}
function restoreOtherWindows(fullBounds) {
  if (!isMac) return;
  tileOtherWindows(fullBounds);
}
function createFlowWindow() {
  const primaryDisplay = require$$7.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const win = new require$$7.BrowserWindow({
    width,
    height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    vibrancy: void 0,
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
      // webSecurity enabled by default in production
    }
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  {
    win.loadURL("http://localhost:5173");
    if (process.env.NODE_ENV === "development") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  }
  win.on("blur", () => {
    setTimeout(() => {
      if (!flowWindow || flowWindow.isDestroyed()) return;
      if (flowWindow.isFocused()) return;
      if (isDocked) return;
      if (Date.now() - showTimestamp < 300) return;
      if (Date.now() < dockTransitionUntil) return;
      logger.debug("[Navi] Blur handler: hiding flow");
      hideFlow();
    }, 100);
  });
  win.on("show", () => {
    isFlowVisible = true;
  });
  win.on("hide", () => {
    isFlowVisible = false;
  });
  return win;
}
function createDockedWindow(bounds) {
  const win = new require$$7.BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: false,
    backgroundColor: "#1c1c1e",
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    movable: false,
    show: false,
    focusable: true,
    title: "Navi",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  {
    win.loadURL(`${"http://localhost:5173"}?docked=true`);
  }
  win.on("closed", () => {
    dockedWindow = null;
  });
  return win;
}
function createSettingsWindow() {
  const win = new require$$7.BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    minimizable: true,
    maximizable: false,
    title: "Navi Settings",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#00000000",
    show: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
      // webSecurity enabled by default in production
    }
  });
  logger.debug("[Settings] Dev URL:", "http://localhost:5174");
  logger.debug("[Settings] Vite Name:", "settings_window");
  {
    win.loadURL(`${"http://localhost:5174"}/settings.html`);
  }
  win.once("ready-to-show", () => {
    win.show();
  });
  win.on("closed", () => {
    settingsWindow = null;
  });
  return win;
}
function toggleSettings() {
  if (settingsWindow) {
    if (settingsWindow.isVisible()) {
      settingsWindow.hide();
    } else {
      settingsWindow.show();
      settingsWindow.focus();
    }
  } else {
    settingsWindow = createSettingsWindow();
  }
}
let lastDisplayId = null;
let isFlowVisible = false;
let showTimestamp = 0;
let opacityAnimationTimer = null;
function animateOpacity(targetOpacity, duration = 120) {
  return new Promise((resolve) => {
    if (!flowWindow) {
      resolve();
      return;
    }
    if (opacityAnimationTimer) {
      clearInterval(opacityAnimationTimer);
      opacityAnimationTimer = null;
    }
    const startOpacity = flowWindow.getOpacity();
    const startTime = Date.now();
    const diff = targetOpacity - startOpacity;
    if (Math.abs(diff) < 0.01) {
      flowWindow.setOpacity(targetOpacity);
      resolve();
      return;
    }
    const step = () => {
      if (!flowWindow) {
        if (opacityAnimationTimer) clearInterval(opacityAnimationTimer);
        opacityAnimationTimer = null;
        resolve();
        return;
      }
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentOpacity = startOpacity + diff * eased;
      flowWindow.setOpacity(currentOpacity);
      if (progress >= 1) {
        if (opacityAnimationTimer) clearInterval(opacityAnimationTimer);
        opacityAnimationTimer = null;
        flowWindow.setOpacity(targetOpacity);
        resolve();
      }
    };
    opacityAnimationTimer = setInterval(step, 16);
    step();
  });
}
function showFlow() {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  const cursor = require$$7.screen.getCursorScreenPoint();
  const display = require$$7.screen.getDisplayNearestPoint(cursor);
  if (!isDocked) {
    const needsReposition = lastDisplayId !== display.id;
    if (needsReposition) {
      lastDisplayId = display.id;
      flowWindow.setBounds({
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width,
        height: display.workArea.height
      });
    }
  }
  isFlowVisible = true;
  showTimestamp = Date.now();
  if (process.platform === "win32") {
    if (!flowWindow.isVisible()) {
      flowWindow.setOpacity(0);
      flowWindow.show();
    }
    animateOpacity(1, 120);
  } else {
    flowWindow.setAlwaysOnTop(true, "floating");
    flowWindow.show();
  }
  flowWindow.focus();
  flowWindow.webContents.send("flow:show");
}
function hideFlow() {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  if (isDocked) return;
  if (Date.now() < dockTransitionUntil) return;
  isFlowVisible = false;
  flowWindow.webContents.send("flow:hide");
  if (process.platform === "win32") {
    animateOpacity(0, 100).then(() => {
      if (flowWindow) {
        flowWindow.blur();
      }
    });
  } else {
    flowWindow.hide();
  }
}
function toggleFlow() {
  if (isDocked && dockedWindow && !dockedWindow.isDestroyed()) {
    if (dockedWindow.isVisible()) {
      dockedWindow.focus();
    } else {
      dockedWindow.show();
      dockedWindow.focus();
    }
    return;
  }
  if (!flowWindow) {
    flowWindow = createFlowWindow();
    if (process.platform === "win32") {
      flowWindow.setOpacity(0);
      flowWindow.showInactive();
    }
    flowWindow.once("ready-to-show", showFlow);
    return;
  }
  isFlowVisible ? hideFlow() : showFlow();
}
async function dockFlowWindow(payload) {
  const docked = payload.docked;
  const side = payload.side ?? dockSide;
  const width = payload.width ?? dockedSize.width;
  const height = payload.height ?? dockedSize.height;
  const cursor = require$$7.screen.getCursorScreenPoint();
  const display = require$$7.screen.getDisplayNearestPoint(cursor);
  const { x, y, width: displayWidth, height: displayHeight } = display.workArea;
  dockSide = side;
  dockedSize = { width, height };
  logger.debug("[Navi] Dock request:", {
    docked,
    payloadSide: payload.side,
    effectiveSide: side,
    storedDockSide: dockSide
  });
  if (!docked) {
    logger.debug("[Navi] Undocking...");
    isDocked = false;
    dockTransitionUntil = Date.now() + 3e3;
    if (dockedWindow && !dockedWindow.isDestroyed()) {
      dockedWindow.close();
      dockedWindow = null;
    }
    restoreOtherWindows({ x, y, width: displayWidth, height: displayHeight });
    if (isMac) {
      require$$7.app.dock.hide();
      logger.debug("[Navi] Dock icon hidden (before showing overlay)");
    }
    setTimeout(() => {
      if (!flowWindow || flowWindow.isDestroyed()) {
        flowWindow = createFlowWindow();
        flowWindow.once("ready-to-show", () => {
          showFlow();
          logger.debug("[Navi] Flow recreated and shown after undock");
        });
        return;
      }
      flowWindow.setIgnoreMouseEvents(true, { forward: true });
      flowWindow.setBounds({ x, y, width: displayWidth, height: displayHeight });
      flowWindow.setAlwaysOnTop(true, "floating");
      showFlow();
      logger.debug("[Navi] Flow shown after undock");
    }, 250);
    return;
  }
  isDocked = true;
  const dockWidth = Math.min(Math.max(width, 320), displayWidth);
  const dockHeight = Math.min(Math.max(height || displayHeight, 200), displayHeight);
  let bounds = { x, y, width: dockWidth, height: dockHeight };
  if (side === "right") {
    bounds.x = x + displayWidth - dockWidth;
  } else if (side === "left") {
    bounds.x = x;
  } else if (side === "top") {
    bounds.y = y;
    bounds.width = displayWidth;
  } else if (side === "bottom") {
    bounds.y = y + displayHeight - dockHeight;
    bounds.width = displayWidth;
  }
  if (flowWindow && !flowWindow.isDestroyed()) {
    flowWindow.hide();
    isFlowVisible = false;
  }
  await showDockWithNaviIcon();
  if (dockedWindow && !dockedWindow.isDestroyed()) {
    dockedWindow.setBounds(bounds);
  } else {
    dockedWindow = createDockedWindow(bounds);
  }
  dockedWindow.once("ready-to-show", () => {
    if (dockedWindow) {
      dockedWindow.show();
      dockedWindow.focus();
    }
    if (side === "right") {
      tileOtherWindows({ x, y, width: displayWidth - dockWidth, height: displayHeight });
    } else if (side === "left") {
      tileOtherWindows({ x: x + dockWidth, y, width: displayWidth - dockWidth, height: displayHeight });
    } else if (side === "top") {
      tileOtherWindows({ x, y: y + dockHeight, width: displayWidth, height: displayHeight - dockHeight });
    } else if (side === "bottom") {
      tileOtherWindows({ x, y, width: displayWidth, height: displayHeight - dockHeight });
    }
  });
  if (dockedWindow.isVisible()) {
    dockedWindow.focus();
  }
}
require$$7.ipcMain.on("flow:hide", hideFlow);
require$$7.ipcMain.on("flow:mouseEnter", () => {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  if (!isDocked) {
    flowWindow.setIgnoreMouseEvents(false);
  }
});
require$$7.ipcMain.on("flow:mouseLeave", () => {
  if (!flowWindow || flowWindow.isDestroyed()) return;
  if (!isDocked) {
    flowWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});
require$$7.ipcMain.handle("flow:dock", async (_event, payload) => {
  try {
    await dockFlowWindow(payload);
  } catch (err) {
    logger.error("[Navi] Dock handler error:", err);
  }
  return { docked: isDocked, side: dockSide };
});
require$$7.ipcMain.on("shell:openExternal", (_e, url) => {
  require$$7.shell.openExternal(url);
});
require$$7.ipcMain.handle("theme:get", () => require$$7.nativeTheme.shouldUseDarkColors);
require$$7.ipcMain.handle("app:getVersion", () => require$$7.app.getVersion());
require$$7.ipcMain.on("settings:setTheme", (_e, theme) => {
  if (flowWindow) {
    flowWindow.webContents.send("settings:themeChanged", theme);
  }
  if (dockedWindow) {
    dockedWindow.webContents.send("settings:themeChanged", theme);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send("settings:themeChanged", theme);
  }
});
require$$7.ipcMain.on("settings:setDockBehavior", (_e, behavior) => {
  dockSide = behavior;
  if (flowWindow) {
    flowWindow.webContents.send("settings:dockBehaviorChanged", behavior);
  }
  if (dockedWindow) {
    dockedWindow.webContents.send("settings:dockBehaviorChanged", behavior);
  }
  if (settingsWindow) {
    settingsWindow.webContents.send("settings:dockBehaviorChanged", behavior);
  }
});
require$$7.ipcMain.on("settings:open", toggleSettings);
function handleDeepLink(url) {
  logger.debug("[DeepLink] Received:", url);
  try {
    const parsed = new URL(url);
    const path2 = parsed.pathname.replace(/^\/+/, "");
    if (parsed.host === "auth" || path2.startsWith("auth")) {
      const route = path2.replace(/^auth\/?/, "");
      if (route === "callback" || route === "") {
        const accessToken = parsed.searchParams.get("access_token");
        const refreshToken = parsed.searchParams.get("refresh_token");
        const userId = parsed.searchParams.get("user_id");
        if (accessToken && refreshToken && userId) {
          const authData = { accessToken, refreshToken, userId };
          if (flowWindow) {
            flowWindow.webContents.send("auth:callback", authData);
          }
          if (dockedWindow) {
            dockedWindow.webContents.send("auth:callback", authData);
          }
          if (settingsWindow) {
            settingsWindow.webContents.send("auth:callback", authData);
            settingsWindow.show();
            settingsWindow.focus();
          }
          logger.debug("[DeepLink] Auth successful for user:", userId);
        }
      } else if (route === "error") {
        const error = parsed.searchParams.get("error");
        const description = parsed.searchParams.get("description");
        if (settingsWindow) {
          settingsWindow.webContents.send("auth:error", { error, description });
          settingsWindow.show();
          settingsWindow.focus();
        }
        logger.error("[DeepLink] Auth error:", error, description);
      }
    }
  } catch (err) {
    logger.error("[DeepLink] Failed to parse URL:", err);
  }
}
require$$7.app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});
const gotTheLock = require$$7.app.requestSingleInstanceLock();
if (!gotTheLock) {
  require$$7.app.quit();
} else {
  require$$7.app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.focus();
    }
  });
}
require$$7.ipcMain.on("auth:login", () => {
  const apiUrl = process.env.NAVI_API_URL || "https://navi-search.vercel.app";
  require$$7.shell.openExternal(`${apiUrl}/api/auth/login`);
});
require$$7.ipcMain.on("auth:logout", () => {
  if (flowWindow) {
    flowWindow.webContents.send("auth:logout");
  }
  if (dockedWindow) {
    dockedWindow.webContents.send("auth:logout");
  }
  if (settingsWindow) {
    settingsWindow.webContents.send("auth:logout");
  }
});
require$$7.app.whenReady().then(() => {
  logger.debug("[Navi] App ready, initializing...");
  if (isMac) {
    require$$7.app.dock.hide();
  }
  function getTrayIconPath() {
    const assetsPath = require$$7.app.isPackaged ? path.join(process.resourcesPath, "assets") : path.join(__dirname, "../../assets");
    logger.debug("[Navi] Assets path:", assetsPath);
    if (isMac) {
      return path.join(assetsPath, "trayIconTemplate.png");
    } else {
      const iconName = require$$7.nativeTheme.shouldUseDarkColors ? "trayIcon-light.png" : "trayIcon-dark.png";
      const iconPath = path.join(assetsPath, iconName);
      logger.debug("[Navi] Tray icon path:", iconPath);
      return iconPath;
    }
  }
  try {
    const trayIconPath = getTrayIconPath();
    logger.debug("[Navi] Creating tray with icon:", trayIconPath);
    tray = new require$$7.Tray(trayIconPath);
    tray.setToolTip("Navi - Press Alt+` to show");
    logger.debug("[Navi] Tray created successfully");
    if (process.platform === "win32" && require$$7.app.isPackaged) {
      tray.displayBalloon({
        iconType: "info",
        title: "Navi is running!",
        content: "Press Alt+` to open Navi. Right-click this icon for options."
      });
    }
  } catch (error) {
    logger.error("[Navi] Failed to create tray:", error);
    require$$7.dialog.showErrorBox("Navi Error", `Failed to create system tray icon: ${error}`);
  }
  if (!isMac && tray) {
    require$$7.nativeTheme.on("updated", () => {
      if (tray) {
        try {
          tray.setImage(getTrayIconPath());
        } catch (error) {
          logger.error("[Navi] Failed to update tray icon:", error);
        }
      }
    });
  }
  if (require$$7.app.isPackaged) {
    const loginSettings = require$$7.app.getLoginItemSettings();
    if (!loginSettings.wasOpenedAtLogin) {
      require$$7.app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true
        // Start hidden (as tray app)
      });
    }
  }
  function buildTrayMenu() {
    const loginSettings = require$$7.app.getLoginItemSettings();
    return require$$7.Menu.buildFromTemplate([
      {
        label: "Toggle Navi",
        accelerator: isMac ? "Cmd+`" : "Alt+`",
        click: toggleFlow
      },
      {
        label: "Settings",
        accelerator: isMac ? "Cmd+." : "Alt+.",
        click: toggleSettings
      },
      { type: "separator" },
      {
        label: "Launch at Startup",
        type: "checkbox",
        checked: loginSettings.openAtLogin,
        click: (menuItem) => {
          require$$7.app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            openAsHidden: true
          });
          if (tray) {
            tray.setContextMenu(buildTrayMenu());
          }
        }
      },
      { type: "separator" },
      { label: "Quit", click: () => require$$7.app.quit() }
    ]);
  }
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    tray.on("click", toggleFlow);
  }
  require$$7.globalShortcut.register(SHORTCUT, toggleFlow);
  require$$7.globalShortcut.register(SETTINGS_SHORTCUT, toggleSettings);
  flowWindow = createFlowWindow();
  logger.debug("[Navi] Flow window created");
  logger.debug("[Navi] Initialization complete. Press Alt+` to show.");
});
require$$7.app.on("will-quit", () => require$$7.globalShortcut.unregisterAll());
require$$7.app.on("window-all-closed", () => {
});
