package io.github.prancheta;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/* Mostra o lembrete agendado. Se o jogo estiver aberto na tela, não incomoda. */
public class NotifReceiver extends BroadcastReceiver {
    static final String CH = "prancheta_lembretes";

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CH, "Lembretes da carreira", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Jogos, propostas e relatórios das suas empresas");
            nm.createNotificationChannel(ch);
        }
    }

    static void show(Context c, int id, String title, String body) {
        try {
            channel(c);
            Intent open = new Intent(c, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent pi = PendingIntent.getActivity(c, 0, open, fl);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            b.setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title).setContentText(body)
                    .setStyle(new Notification.BigTextStyle().bigText(body))
                    .setAutoCancel(true).setContentIntent(pi);
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            nm.notify(id, b.build());
        } catch (Exception ignored) {}
    }

    @Override
    public void onReceive(Context c, Intent i) {
        if (MainActivity.inFront) return;
        show(c, i.getIntExtra("id", 1), i.getStringExtra("title"), i.getStringExtra("body"));
    }
}
