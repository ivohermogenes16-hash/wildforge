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

/* Ponte chamada pelo jogo (window.PranchetaNative) para agendar lembretes no Android. */
public class NativeBridge {
    private final Activity act;
    NativeBridge(Activity a) { act = a; }

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
