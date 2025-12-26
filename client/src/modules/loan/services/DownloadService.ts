import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';

export class DownloadService {
  static async downloadPDF(filename: string, base64Data: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();

      if (platform === 'web') {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64Data}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Native Logic
      try {
        // Strategy A: App Specific External Storage
        // Path: /Android/data/com.jls.financesuite/files/JLS_Downloads/<filename>
        try {
          try {
            await Filesystem.mkdir({
              path: 'JLS_Downloads',
              directory: Directory.External,
              recursive: true
            });
          } catch (e) {
            // Ignore 'already exists' errors
            // console.log('Directory might already exist', e);
          }

          const result = await Filesystem.writeFile({
            path: `JLS_Downloads/${filename}`,
            data: base64Data,
            directory: Directory.External,
          });

          console.log('File saved to External:', result.uri);

          // Notification
          try {
            await LocalNotifications.schedule({
              notifications: [{
                title: 'Download Complete',
                body: `${filename} saved successfully.`,
                id: new Date().getTime(),
                schedule: { at: new Date(Date.now() + 100) },
                smallIcon: 'ic_launcher',
                extra: null
              }]
            });
          } catch (nErr) { console.warn('Notification failed:', nErr); }

          // Save to cache for easy access
          const cacheResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Cache
          });

          // Short delay
          await new Promise(r => setTimeout(r, 200));

          // Ask user what to do
          const action = confirm(`✅ ${filename} downloaded!\n\nTap OK to OPEN or Cancel to just SAVE.`);

          if (action) {
            // User wants to open - Use Share as opener
            await Share.share({
              title: filename,
              url: cacheResult.uri,
              dialogTitle: 'Open PDF with...'
            });
          }
          // If cancelled, file is already saved, do nothing

        } catch (externalError: any) {
          console.error('App Storage failed:', externalError);
          // Fallback
          try {
            const cacheResult = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Cache
            });

            const action = confirm(`⚠️ Saved to temporary storage.\n\nTap OK to OPEN or Cancel to close.`);
            if (action) {
              await Share.share({
                title: 'Open File',
                url: cacheResult.uri,
                dialogTitle: 'Open PDF'
              });
            }
          } catch (shareErr) {
            alert(`⚠️ Download Error: ${externalError.message}`);
          }
        }

      } catch (error: any) {
        console.error('Error downloading PDF:', error);
        alert('❌ Download Failed: ' + (error.message || error));
      }
    } catch (appError) {
      console.error('Unexpected error in download service:', appError);
    }
  }
}
