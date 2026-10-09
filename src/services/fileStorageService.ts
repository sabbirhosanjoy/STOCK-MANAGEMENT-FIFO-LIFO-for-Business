/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BackupPayload } from '../types';

/**
 * Save data directly to any folder on the computer selected by the user.
 * Uses the modern File System Access API (window.showSaveFilePicker) in supported browsers,
 * allowing the user to pick any folder and name the file.
 * Falls back to an automatic JSON download for any browser without showSaveFilePicker.
 */
export async function savePayloadToComputer(
  payload: BackupPayload,
  customFileName?: string
): Promise<{ success: boolean; method: 'picker' | 'download'; filename: string; error?: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const defaultFilename = customFileName || `nakshalata-data-${timestamp}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);

  // 1. Try File System Access API (Allows selecting ANY folder on PC)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const pickerOpts = {
        suggestedName: defaultFilename,
        types: [
          {
            description: 'NakshaLata Database File (*.json)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      };

      // @ts-ignore - showSaveFilePicker is available in Chromium browsers
      const fileHandle = await (window as any).showSaveFilePicker(pickerOpts);
      const writable = await fileHandle.createWritable();
      await writable.write(jsonContent);
      await writable.close();

      return {
        success: true,
        method: 'picker',
        filename: fileHandle.name || defaultFilename,
      };
    } catch (err: any) {
      // If user cancelled the picker dialog, do not trigger download fallback
      if (err?.name === 'AbortError') {
        return {
          success: false,
          method: 'picker',
          filename: defaultFilename,
          error: 'ব্যবহারকারী সেভ বাতিল করেছেন।',
        };
      }
      // If permission or other error, proceed to fallback download
      console.warn('showSaveFilePicker failed, using fallback download:', err);
    }
  }

  // 2. Reliable Fallback: Trigger standard browser file download to local PC
  try {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      method: 'download',
      filename: defaultFilename,
    };
  } catch (err: any) {
    return {
      success: false,
      method: 'download',
      filename: defaultFilename,
      error: err?.message || 'ফাইল সেভ করা সম্ভব হয়নি।',
    };
  }
}

/**
 * Open and parse a saved JSON backup file from the computer.
 * Uses window.showOpenFilePicker where available, or standard file input dialog.
 */
export async function openPayloadFromComputer(): Promise<{
  success: boolean;
  payload?: BackupPayload;
  filename?: string;
  error?: string;
}> {
  // 1. Try modern File System Access API
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const pickerOpts = {
        types: [
          {
            description: 'NakshaLata Database File (*.json)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
        multiple: false,
      };

      // @ts-ignore
      const [fileHandle] = await (window as any).showOpenFilePicker(pickerOpts);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.settings || !parsed.inventory || !parsed.orders) {
        return {
          success: false,
          error: 'নির্বাচিত ফাইলটি সঠিক নকশালতা ডাটা ফাইল নয়! অনুগ্রহ করে সঠিক .json ফাইল নির্বাচন করুন।',
        };
      }

      return {
        success: true,
        payload: parsed as BackupPayload,
        filename: file.name,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, error: 'ফাইল ওপেন বাতিল করা হয়েছে।' };
      }
      console.warn('showOpenFilePicker failed, falling back to file input:', err);
    }
  }

  // 2. Standard Universal Browser File Input dialog
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ success: false, error: 'কোন ফাইল নির্বাচন করা হয়নি।' });
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);

          if (!parsed.settings || !parsed.inventory || !parsed.orders) {
            resolve({
              success: false,
              error: 'নির্বাচিত ফাইলটি সঠিক নকশালতা ডাটা ফাইল নয়! অনুগ্রহ করে সঠিক .json ফাইল নির্বাচন করুন।',
            });
            return;
          }

          resolve({
            success: true,
            payload: parsed as BackupPayload,
            filename: file.name,
          });
        } catch (readErr: any) {
          resolve({
            success: false,
            error: 'ফাইলটি পড়তে সমস্যা হয়েছে: ' + (readErr?.message || 'অবৈধ JSON'),
          });
        } finally {
          document.body.removeChild(input);
        }
      };

      input.oncancel = () => {
        resolve({ success: false, error: 'ফাইল ওপেন বাতিল করা হয়েছে।' });
        try {
          document.body.removeChild(input);
        } catch {}
      };

      document.body.appendChild(input);
      input.click();
    } catch (err: any) {
      resolve({
        success: false,
        error: 'ফাইল ডায়ালগ খুলতে ব্যর্থ: ' + (err?.message || 'অজানা সমস্যা'),
      });
    }
  });
}
