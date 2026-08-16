// =============================================================================
// APPANDOR LOGISTICS: LOGGING MODUL
// =============================================================================

const fs = require('fs');
const path = require('path');

const logFile0 = path.join(__dirname, 'combined.log');
const logFile1 = path.join(__dirname, 'combined.log.1');
const logFile2 = path.join(__dirname, 'combined.log.2');

let logStream = fs.createWriteStream(logFile0, { flags: 'a' });

const originalLog   = console.log;
const originalWarn  = console.warn;
const originalError = console.error;

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB Limit
const sizeInMB = Math.round(MAX_SIZE / (1024 * 1024));
let isRotating = false;

function formatLogEntry(type, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  return `[${timestamp}] [${type}] ${message}\n`;
}

function handleRotation() {
  if (isRotating) return;
  isRotating = true;

  logStream.end(() => {
    fs.unlink(logFile2, () => {
      fs.rename(logFile1, logFile2, () => {
        fs.rename(logFile0, logFile1, (err) => {
          logStream = fs.createWriteStream(logFile0, { flags: 'a' });
          isRotating = false;
          if (!err) {
            originalLog(`[File-Logger]: New logfile generated. Max size (${sizeInMB}MB) exceeded.`);            
          }
        });
      });
    });
  });
}

function writeAndCheck(logLine) {
  logStream.write(logLine);
  if (!isRotating) {
    fs.stat(logFile0, (err, stats) => {
      if (!err && stats.size >= MAX_SIZE) {
        handleRotation();
      }
    });
  }
}

// Überschreiben der globalen console-Methoden
console.log = function(...args) {
  originalLog.apply(console, args);
  writeAndCheck(formatLogEntry('INFO', args));
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  writeAndCheck(formatLogEntry('ATTACK', args));
};

console.error = function(...args) {
  originalError.apply(console, args);
  writeAndCheck(formatLogEntry('ERROR', args));
};

console.log(`[File-Logger]: Max logfile size set to ${sizeInMB}MB.`);
