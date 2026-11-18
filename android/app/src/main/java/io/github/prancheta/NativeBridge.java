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

/* Ponte chamada pelo jogo (window.PranchetaNative) para agendar lembretes no Android. */
public class NativeBridge {
    private final Activity act;
    NativeBridge(Activity a) { act = a; }

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
}
