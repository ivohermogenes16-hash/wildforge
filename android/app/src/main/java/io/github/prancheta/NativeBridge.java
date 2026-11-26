package io.github.prancheta;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.SystemClock;
import android.webkit.JavascriptInterface;
import android.net.Uri;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.os.Environment;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import android.speech.tts.TextToSpeech;
import java.util.Locale;
import android.webkit.WebView;
import android.content.ClipData;
import android.content.ClipboardManager;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

/* Ponte chamada pelo jogo (window.PranchetaNative) para agendar lembretes no Android. */
public class NativeBridge {
    private final Activity act;
    NativeBridge(Activity a) { act = a; }
    WebView web;

    /* ---------- anúncio com recompensa (AdMob) ---------- */
    private RewardedAd ad; private boolean adLoading = false, adInit = false, showWhenReady = false; private String adUnitId = "";
    private void js(final String st) { act.runOnUiThread(() -> { try { if (web != null) web.evaluateJavascript("window.onPranchetaAd && window.onPranchetaAd('" + st + "')", null); } catch (Throwable ignored) {} }); }
    private void adLoad(String unit) {
        if (unit != null && !unit.isEmpty()) adUnitId = unit;
        if (ad != null || adLoading || adUnitId.isEmpty()) return;
        adLoading = true;
        act.runOnUiThread(() -> {
            try {
                if (!adInit) { MobileAds.initialize(act.getApplicationContext(), st -> {}); adInit = true; }
                RewardedAd.load(act, adUnitId, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
                    @Override public void onAdLoaded(RewardedAd r) { ad = r; adLoading = false; if (showWhenReady) { showWhenReady = false; adShowNow(); } }
                    @Override public void onAdFailedToLoad(LoadAdError e) { ad = null; adLoading = false; if (showWhenReady) { showWhenReady = false; js("fail"); } }
                });
            } catch (Throwable t) { adLoading = false; if (showWhenReady) { showWhenReady = false; js("fail"); } }
        });
    }
    private void adShowNow() {
        act.runOnUiThread(() -> {
            final RewardedAd r = ad; if (r == null) { js("fail"); return; }
            ad = null; final boolean[] got = { false };
            r.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdDismissedFullScreenContent() { js(got[0] ? "ok" : "closed"); adLoad(null); }
                @Override public void onAdFailedToShowFullScreenContent(AdError e) { js("fail"); adLoad(null); }
            });
            try { r.show(act, item -> got[0] = true); } catch (Throwable t) { js("fail"); }
        });
    }
    @JavascriptInterface
    public void loadAd(String unit) { adLoad(unit); }
    @JavascriptInterface
    public void showAd(String unit) {
        if (ad != null) { adShowNow(); return; }
        showWhenReady = true; adLoad(unit);
        act.getWindow().getDecorView().postDelayed(() -> { if (showWhenReady) { showWhenReady = false; js("fail"); } }, 20000);
    }
    @JavascriptInterface
    public boolean adReady() { return ad != null; }

    /* copiar texto (código do Pix) */
    @JavascriptInterface
    public void copy(String text) {
        act.runOnUiThread(() -> { try { ClipboardManager cm = (ClipboardManager) act.getSystemService(Context.CLIPBOARD_SERVICE); cm.setPrimaryClip(ClipData.newPlainText("Pix", text)); } catch (Throwable ignored) {} });
    }

    /* voz do narrador: usa o motor de voz do próprio celular (a WebView não tem speechSynthesis) */
    private TextToSpeech tts; private boolean ttsOk = false;
    private void ttsInit() {
        if (tts != null) return;
        tts = new TextToSpeech(act.getApplicationContext(), st -> {
            if (st == TextToSpeech.SUCCESS) { int r = tts.setLanguage(new Locale("pt", "BR")); ttsOk = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED; if (!ttsOk) { tts.setLanguage(new Locale("pt")); ttsOk = true; } }
        });
    }
    @JavascriptInterface
    public boolean ttsReady() { ttsInit(); return ttsOk; }
    @JavascriptInterface
    public void speak(String text, float rate, float pitch, boolean flush) {
        try { ttsInit(); if (!ttsOk) return; tts.setSpeechRate(rate); tts.setPitch(pitch); tts.speak(text, flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, null, "p" + System.nanoTime()); } catch (Throwable ignored) {}
    }
    @JavascriptInterface
    public boolean speaking() { try { return tts != null && tts.isSpeaking(); } catch (Throwable t) { return false; } }
    @JavascriptInterface
    public void stopSpeak() { try { if (tts != null) tts.stop(); } catch (Throwable ignored) {} }

    static PendingIntent pi(Context c, int id, String title, String body) {
        Intent i = new Intent(c, NotifReceiver.class);
        i.putExtra("id", id); i.putExtra("title", title); i.putExtra("body", body);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(c, 1000 + id, i, fl);
    }

    @JavascriptInterface
    public void schedule(int id, String title, String body, double delayMs) {
        try {
            AlarmManager am = (AlarmManager) act.getSystemService(Context.ALARM_SERVICE);
            long at = SystemClock.elapsedRealtime() + (long) Math.max(1000, delayMs);
            PendingIntent p = pi(act, id, title, body);
            if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, p);
            else am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, p);
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void cancel(int id) {
        try {
            AlarmManager am = (AlarmManager) act.getSystemService(Context.ALARM_SERVICE);
            am.cancel(pi(act, id, "", ""));
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void notify(int id, String title, String body) {
        NotifReceiver.show(act, id, title, body);
    }

    @JavascriptInterface
    public boolean permission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (act.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                act.runOnUiThread(() -> act.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 77));
                return false;
            }
        }
        return true;
    }

    /* versão instalada (para o aviso de atualização obrigatória) */
    @JavascriptInterface
    public int versionCode() {
        try { return (int) act.getPackageManager().getPackageInfo(act.getPackageName(), 0).getLongVersionCode(); }
        catch (Throwable t) { try { return act.getPackageManager().getPackageInfo(act.getPackageName(), 0).versionCode; } catch (Throwable t2) { return 0; } }
    }

    /* abre um link no navegador do celular (baixar a atualização, procurar escudos) */
    @JavascriptInterface
    public void openUrl(String url) {
        try { Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url)); i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); act.startActivity(i); } catch (Throwable ignored) {}
    }

    /* salva um arquivo (pacote exportado) na pasta Downloads */
    @JavascriptInterface
    public String saveFile(String name, String base64, String mime) {
        try {
            byte[] data = Base64.decode(base64, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                v.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                Uri u = act.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) return "";
                try (OutputStream o = act.getContentResolver().openOutputStream(u)) { o.write(data); }
                return "Downloads/" + name;
            } else {
                File dir = act.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) return "";
                File f = new File(dir, name);
                try (FileOutputStream o = new FileOutputStream(f)) { o.write(data); }
                return f.getAbsolutePath();
            }
        } catch (Throwable t) { return ""; }
    }
}
