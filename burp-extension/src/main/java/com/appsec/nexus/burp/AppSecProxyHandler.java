package com.appsec.nexus.burp;

import burp.api.montoya.MontoyaApi;
import burp.api.montoya.http.message.HttpHeader;
import burp.api.montoya.http.message.requests.HttpRequest;
import burp.api.montoya.proxy.http.InterceptedResponse;
import burp.api.montoya.proxy.http.ProxyResponseHandler;
import burp.api.montoya.proxy.http.ProxyResponseReceivedAction;
import burp.api.montoya.proxy.http.ProxyResponseToBeSentAction;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Intercepts HTTP request/response pairs flowing through Burp Proxy and passes them to AppSec.
 */
public class AppSecProxyHandler implements ProxyResponseHandler {
    private final MontoyaApi api;
    private final AppSecTab tab;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    public AppSecProxyHandler(MontoyaApi api, AppSecTab tab) {
        this.api = api;
        this.tab = tab;
    }

    @Override
    public ProxyResponseReceivedAction handleResponseReceived(InterceptedResponse interceptedResponse) {
        try {
            HttpRequest req = interceptedResponse.initiatingRequest();
            if (req == null) {
                req = interceptedResponse.request();
            }

            if (req != null) {
                String url = req.url();

                // Check scope filter
                if (tab.isInScopeOnly() && !api.scope().isInScope(url)) {
                    return ProxyResponseReceivedAction.continueWith(interceptedResponse);
                }

                // Check custom domain filter
                String domainFilter = tab.getDomainFilter();
                if (!domainFilter.isEmpty()) {
                    String host = req.httpService() != null ? req.httpService().host() : "";
                    if (!matchesFilter(host, domainFilter) && !matchesFilter(url, domainFilter)) {
                        return ProxyResponseReceivedAction.continueWith(interceptedResponse);
                    }
                }

                // Build TrafficRecord
                TrafficRecord record = new TrafficRecord();
                record.id = UUID.randomUUID().toString();
                record.timestamp = LocalTime.now().format(TIME_FMT);
                record.method = req.method();
                record.url = url;
                record.host = req.httpService() != null ? req.httpService().host() : "";
                record.path = req.path();
                record.statusCode = interceptedResponse.statusCode();
                record.isTls = req.httpService() != null && req.httpService().secure();
                record.source = "Burp Proxy";

                // Headers
                for (HttpHeader h : req.headers()) {
                    record.requestHeaders.put(h.name(), h.value());
                }
                for (HttpHeader h : interceptedResponse.headers()) {
                    record.responseHeaders.put(h.name(), h.value());
                }

                // Bodies
                record.requestBody = req.bodyToString();
                record.responseBody = interceptedResponse.bodyToString();
                record.responseSize = interceptedResponse.body() != null ? interceptedResponse.body().length() : 0;

                // Latency placeholder
                record.latencyMs = 25;

                // Pass to tab (and auto-export if enabled)
                tab.addTrafficRecord(record, tab.isLiveIngestionEnabled());
            }
        } catch (Exception e) {
            tab.log("Proxy handler error: " + e.getMessage());
        }

        return ProxyResponseReceivedAction.continueWith(interceptedResponse);
    }

    @Override
    public ProxyResponseToBeSentAction handleResponseToBeSent(InterceptedResponse interceptedResponse) {
        return ProxyResponseToBeSentAction.continueWith(interceptedResponse);
    }

    private static boolean matchesFilter(String text, String filter) {
        if (text == null || filter == null) return false;
        String t = text.toLowerCase();
        String f = filter.toLowerCase().replace("*", "");
        return t.contains(f);
    }
}
