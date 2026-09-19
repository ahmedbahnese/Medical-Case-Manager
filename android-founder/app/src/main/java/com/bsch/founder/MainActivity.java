package com.bsch.founder;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.http.SslError;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;
import android.graphics.Typeface;

public class MainActivity extends Activity {
    private static final int AUDIO_PERMISSION = 401;
    private static final String PREFS = "bsch_founder";
    private static final String DEFAULT_URL = "http://192.168.1.100:3000";
    private WebView webView;
    private EditText serverInput;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        requestAudioPermission();
        buildScreen();
    }

    private void requestAudioPermission() {
        if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION);
        }
    }

    private void buildScreen() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String savedUrl = prefs.getString("server_url", DEFAULT_URL);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(18, 18, 18, 0);
        root.setBackgroundColor(Color.WHITE);

        TextView title = new TextView(this);
        title.setText("BSCH Mobile");
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setTextColor(Color.rgb(15, 23, 42));
        title.setGravity(Gravity.RIGHT);
        root.addView(title, new LinearLayout.LayoutParams(-1, 54));

        LinearLayout connection = new LinearLayout(this);
        connection.setOrientation(LinearLayout.HORIZONTAL);
        serverInput = new EditText(this);
        serverInput.setText(savedUrl);
        serverInput.setSingleLine(true);
        serverInput.setHint("http://192.168.1.10:3000");
        serverInput.setTextDirection(View.TEXT_DIRECTION_LTR);
        Button connect = new Button(this);
        connect.setText("اتصال");
        connection.addView(serverInput, new LinearLayout.LayoutParams(0, 58, 1));
        connection.addView(connect, new LinearLayout.LayoutParams(120, 58));
        root.addView(connection);

        webView = new WebView(this);
        configureWebView();
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);

        connect.setOnClickListener(v -> loadServer());
        loadServer();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setUserAgentString(settings.getUserAgentString() + " BSCH-Mobile-App");
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                return !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme));
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) { handler.cancel(); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        requestAudioPermission();
                        request.deny();
                    } else {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    }
                });
            }
        });
    }

    private void loadServer() {
        String url = serverInput.getText().toString().trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) url = "http://" + url;
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        serverInput.setText(url);
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("server_url", url).apply();
        webView.loadUrl(url);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
