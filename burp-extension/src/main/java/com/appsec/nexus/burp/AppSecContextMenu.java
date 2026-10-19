package com.appsec.nexus.burp;

import burp.api.montoya.MontoyaApi;
import burp.api.montoya.http.message.HttpHeader;
import burp.api.montoya.http.message.HttpRequestResponse;
import burp.api.montoya.http.message.requests.HttpRequest;
import burp.api.montoya.http.message.responses.HttpResponse;
import burp.api.montoya.ui.contextmenu.ContextMenuEvent;
import burp.api.montoya.ui.contextmenu.ContextMenuItemsProvider;

import javax.swing.*;
import java.awt.*;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Context menu provider that adds 'Send to AppSec Nexus' to Burp Suite right-click menus.
 */
public class AppSecContextMenu implements ContextMenuItemsProvider {
    private final MontoyaApi api;
    private final AppSecTab tab;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    public AppSecContextMenu(MontoyaApi api, AppSecTab tab) {
        this.api = api;
        this.tab = tab;
    }

    @Override
    public List<Component> provideMenuItems(ContextMenuEvent event) {
        List<HttpRequestResponse> selected = event.selectedRequestResponses();
        if (selected == null || selected.isEmpty()) {
            return Collections.emptyList();
        }

        JMenuItem sendMenuItem = new JMenuItem("Send to AppSec Nexus (" + selected.size() + " item" + (selected.size() > 1 ? "s" : "") + ")");
        sendMenuItem.addActionListener(e -> {
            List<TrafficRecord> records = new ArrayList<>();
            for (HttpRequestResponse item : selected) {
                HttpRequest req = item.request();
                HttpResponse res = item.response();
                if (req == null) continue;

                TrafficRecord rec = new TrafficRecord();
                rec.id = UUID.randomUUID().toString();
                rec.timestamp = LocalTime.now().format(TIME_FMT);
                rec.method = req.method();
                rec.url = req.url();
                rec.host = req.httpService() != null ? req.httpService().host() : "";
                rec.path = req.path();
                rec.source = "Burp Context Menu";
                rec.isTls = req.httpService() != null && req.httpService().secure();

                for (HttpHeader h : req.headers()) {
                    rec.requestHeaders.put(h.name(), h.value());
                }
                rec.requestBody = req.bodyToString();

                if (res != null) {
                    rec.statusCode = res.statusCode();
                    for (HttpHeader h : res.headers()) {
                        rec.responseHeaders.put(h.name(), h.value());
                    }
                    rec.responseBody = res.bodyToString();
                    rec.responseSize = res.body() != null ? res.body().length() : 0;
                } else {
                    rec.statusCode = 0;
                    rec.responseSize = 0;
                }

                if (tab.isRedactSecrets()) {
                    rec.redactSensitiveData();
                }

                tab.addTrafficRecord(rec, true);
                records.add(rec);
            }

            tab.log("Context Menu: Sent " + records.size() + " items to AppSec Nexus.");
        });

        List<Component> menuList = new ArrayList<>();
        menuList.add(sendMenuItem);
        return menuList;
    }
}
