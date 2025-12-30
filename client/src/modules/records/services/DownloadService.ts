import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export class DownloadService {
  /**
   * Downloads a PDF (Base64) by saving it to Cache and triggering the Native Share Sheet.
   * This ensures immediate access "Sidhi Share" without broad Storage Permissions.
   */
  static async downloadPDF(filename: string, base64Data: string): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();

      if (platform === 'web') {
        const link = document.createElement('a');
        const fileNameWithExt = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        link.href = `data:application/pdf;base64,${base64Data}`;
        link.download = fileNameWithExt;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Native Logic: "Download and Share Directly"
      try {
        const fileNameWithExt = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

        // 1. Save to Cache (No Permissions Required, Safe & Fast)
        // This avoids "Spyware Heuristic" flags related to broad External Storage access.
        const result = await Filesystem.writeFile({
          path: fileNameWithExt,
          data: base64Data,
          directory: Directory.Cache
        });

        console.log('PDF Saved to Cache:', result.uri);

        // 2. Immediate Share (Sidhi Share)
        // This opens the System Share Sheet. User can "Save to Files", "WhatsApp", "Drive", etc.
        try {
          await Share.share({
            title: 'BillBook Invoice',
            text: `Here is the invoice: ${fileNameWithExt}`,
            url: result.uri,
            dialogTitle: 'Share Invoice'
          });
        } catch (shareError) {
          // Share dismissed or failed
          console.log('Share dismissed/failed:', shareError);
        }

        // 3. Optional: Attempt to save a copy to "Documents" for persistence (Best Effort)
        // This helps if the user wants to find it later without Sharing, but we don't block on it.
        try {
          await Filesystem.writeFile({
            path: `BillBook/${fileNameWithExt}`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          console.log('Saved backup to Documents/BillBook');
        } catch (docErr) {
          // Ignore persistence error, usage flow is "Share"
          console.log('Could not save persistent copy to Documents (Non-critical)');
        }

      } catch (error: any) {
        console.error('Error handling PDF:', error);
        alert('Unable to prepare PDF for sharing. Please try again.');
      }
    } catch (appError) {
      console.error('Unexpected error in download service:', appError);
    }
  }
}
