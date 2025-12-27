package com.billbook.app;

import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Allow content behind system bars - CSS safe-area padding will position it
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Set status bar color to match app theme
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(0xFF0B1220); // Dark theme status bar color
        }
    }
}
