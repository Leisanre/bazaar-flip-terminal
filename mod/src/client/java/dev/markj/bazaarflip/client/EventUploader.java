package dev.markj.bazaarflip.client;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Batches [Bazaar] chat lines and posts them to the terminal server every
 * two seconds. Fire-and-forget: a dead server just means dropped batches and
 * a console note — never a gameplay problem.
 */
public class EventUploader {
	private static final Gson GSON = new Gson();

	private final HttpClient http = HttpClient.newBuilder()
		.connectTimeout(Duration.ofSeconds(3))
		.build();
	private final ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
	private final ScheduledExecutorService scheduler =
		Executors.newSingleThreadScheduledExecutor(r -> {
			Thread t = new Thread(r, "bazaarflip-uploader");
			t.setDaemon(true);
			return t;
		});
	private final String endpoint;
	private final String player;

	public EventUploader(String endpoint, String player) {
		this.endpoint = endpoint;
		this.player = player;
		scheduler.scheduleAtFixedRate(this::flush, 2, 2, TimeUnit.SECONDS);
	}

	public void enqueue(String line) {
		queue.add(line);
	}

	private void flush() {
		if (queue.isEmpty()) return;

		List<String> batch = new ArrayList<>();
		String line;
		while ((line = queue.poll()) != null) {
			batch.add(line);
		}

		JsonObject body = new JsonObject();
		body.addProperty("player", player);
		JsonArray lines = new JsonArray();
		batch.forEach(lines::add);
		body.add("lines", lines);

		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create(endpoint))
			.timeout(Duration.ofSeconds(5))
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(GSON.toJson(body)))
			.build();

		http.sendAsync(request, HttpResponse.BodyHandlers.discarding())
			.exceptionally(e -> {
				System.err.println("[bazaarflip] upload failed (server offline?): " + e.getMessage());
				return null;
			});
	}
}
