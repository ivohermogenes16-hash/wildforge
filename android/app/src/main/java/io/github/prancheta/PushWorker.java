package io.github.prancheta;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/* Notificações enviadas pelo painel Lumbra Control para todos os jogadores.
   De tempos em tempos (mesmo com o jogo fechado) o Android acorda este trabalho,
   que olha se tem aviso novo e mostra na barra de notificações. */
public class PushWorker extends Worker {
    static final String KEY = "AIzaSyAFevjfHH4l04WyU3H2rxmvhiENlacBUO4";
    static final String DB = "https://lumbra-control-default-rtdb.firebaseio.com/remote/prancheta/push.json";

    public PushWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    static void schedule(Context c) {
        try {
            Constraints k = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
            PeriodicWorkRequest r = new PeriodicWorkRequest.Builder(PushWorker.class, 30, TimeUnit.MINUTES).setConstraints(k).build();
            WorkManager.getInstance(c).enqueueUniquePeriodicWork("lumbra_push", ExistingPeriodicWorkPolicy.KEEP, r);
            OneTimeWorkRequest now = new OneTimeWorkRequest.Builder(PushWorker.class).setConstraints(k).setInitialDelay(20, TimeUnit.SECONDS).build();
            WorkManager.getInstance(c).enqueueUniqueWork("lumbra_push_now", ExistingWorkPolicy.REPLACE, now);
        } catch (Throwable ignored) {}
    }

    static String http(String url, String body, String type) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setConnectTimeout(15000); h.setReadTimeout(15000);
        if (body != null) { h.setRequestMethod("POST"); h.setDoOutput(true); h.setRequestProperty("Content-Type", type);
            try (OutputStream o = h.getOutputStream()) { o.write(body.getBytes(StandardCharsets.UTF_8)); } }
        int code = h.getResponseCode(); if (code >= 400) throw new Exception("http " + code);
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(h.getInputStream(), StandardCharsets.UTF_8))) { String l; while ((l = r.readLine()) != null) sb.append(l); }
        return sb.toString();
    }

    static String token(SharedPreferences sp) throws Exception {
        String rt = sp.getString("rt", null);
        if (rt != null) {
            try {
                JSONObject j = new JSONObject(http("https://securetoken.googleapis.com/v1/token?key=" + KEY, "grant_type=refresh_token&refresh_token=" + rt, "application/x-www-form-urlencoded"));
                sp.edit().putString("rt", j.optString("refresh_token", rt)).apply();
                return j.getString("id_token");
            } catch (Exception e) { /* conta expirada: cria outra */ }
        }
        JSONObject j = new JSONObject(http("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + KEY, "{\"returnSecureToken\":true}", "application/json"));
        sp.edit().putString("rt", j.getString("refreshToken")).apply();
        return j.getString("idToken");
    }

    @NonNull @Override
    public Result doWork() {
        Context c = getApplicationContext();
        SharedPreferences sp = c.getSharedPreferences("lumbra_push", Context.MODE_PRIVATE);
        try {
            String raw = http(DB + "?auth=" + token(sp), null, null);
            if (raw == null || raw.equals("null")) return Result.success();
            JSONObject p = new JSONObject(raw);
            if (!p.optBoolean("on", false)) return Result.success();
            String id = p.optString("id", "");
            if (id.isEmpty() || id.equals(sp.getString("last", ""))) return Result.success();
            long created = p.optLong("created", 0);
            sp.edit().putString("last", id).apply();
            if (created > 0 && System.currentTimeMillis() - created > 3L * 24 * 3600 * 1000) return Result.success();
            String title = p.optString("title", "Prancheta");
            String text = p.optString("text", "");
            NotifReceiver.show(c, 9000 + Math.abs(id.hashCode() % 900), title, text);
            return Result.success();
        } catch (Exception e) { return Result.retry(); }
    }
}
