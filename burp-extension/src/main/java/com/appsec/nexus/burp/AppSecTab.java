package com.appsec.nexus.burp;

import burp.api.montoya.MontoyaApi;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Custom Burp Suite UI Suite Tab for AppSec Nexus Integration.
 */
public class AppSecTab extends JPanel {
    private final MontoyaApi api;
    private final AppSecConnectorClient client;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Configuration controls
    private JTextField urlField;
    private JPasswordField tokenField;
    private JCheckBox showTokenCheck;
    private JButton testConnButton;
    private JLabel statusLabel;

    // Filters and controls
    private JCheckBox liveIngestCheck;
    private JCheckBox inScopeOnlyCheck;
    private JCheckBox redactSecretsCheck;
    private JTextField domainFilterField;

    // Traffic Table
    private DefaultTableModel tableModel;
    private JTable trafficTable;
    private final List<TrafficRecord> trafficRecords = new ArrayList<>();

    // Inspector
    private JTextArea requestArea;
    private JTextArea responseArea;
    private JTextArea logArea;

    public AppSecTab(MontoyaApi api) {
        this.api = api;
        this.client = new AppSecConnectorClient("http://127.0.0.1:41785", "");
        initUI();
    }

    public boolean isLiveIngestionEnabled() {
        return liveIngestCheck != null && liveIngestCheck.isSelected();
    }

    public boolean isInScopeOnly() {
        return inScopeOnlyCheck != null && inScopeOnlyCheck.isSelected();
    }

    public boolean isRedactSecrets() {
        return redactSecretsCheck != null && redactSecretsCheck.isSelected();
    }

    public String getDomainFilter() {
        return domainFilterField != null ? domainFilterField.getText().trim() : "";
    }

    public AppSecConnectorClient getClient() {
        return client;
    }

    public void log(String message) {
        SwingUtilities.invokeLater(() -> {
            if (logArea != null) {
                logArea.append("[" + java.time.LocalTime.now().toString().substring(0, 8) + "] " + message + "\n");
                logArea.setCaretPosition(logArea.getDocument().getLength());
            }
        });
    }

    public void addTrafficRecord(TrafficRecord record, boolean autoExport) {
        SwingUtilities.invokeLater(() -> {
            trafficRecords.add(record);
            int rowIdx = trafficRecords.size();
            tableModel.addRow(new Object[]{
                    rowIdx,
                    record.timestamp,
                    record.method,
                    record.url,
                    record.statusCode,
                    record.responseSize,
                    record.latencyMs + "ms",
                    record.exportStatus
            });
        });

        if (autoExport) {
            executor.submit(() -> {
                if (isRedactSecrets()) {
                    record.redactSensitiveData();
                }
                List<TrafficRecord> batch = new ArrayList<>();
                batch.add(record);
                AppSecConnectorClient.IngestionResult result = client.exportTraffic(batch);
                SwingUtilities.invokeLater(() -> {
                    int lastRow = trafficRecords.size() - 1;
                    if (lastRow >= 0 && lastRow < tableModel.getRowCount()) {
                        String status = result.isSuccess ? "Exported (Auto)" : "Failed";
                        record.exportStatus = status;
                        tableModel.setValueAt(status, lastRow, 7);
                    }
                });
                if (result.isSuccess) {
                    log("Auto-exported: " + record.method + " " + record.url + " (" + record.statusCode + ")");
                } else {
                    log("Auto-export error: " + result.message);
                }
            });
        }
    }

    private void initUI() {
        setLayout(new BorderLayout(10, 10));
        setBorder(new EmptyBorder(10, 10, 10, 10));

        // 1. TOP PANEL: Title & Config
        JPanel topPanel = new JPanel(new BorderLayout(10, 10));

        JPanel headerPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 12, 5));
        JLabel titleLabel = new JLabel("AppSec Nexus — Burp Suite Connector");
        titleLabel.setFont(titleLabel.getFont().deriveFont(Font.BOLD, 16f));
        headerPanel.add(titleLabel);

        statusLabel = new JLabel("Status: Disconnected / Not Checked");
        statusLabel.setForeground(Color.GRAY);
        statusLabel.setFont(statusLabel.getFont().deriveFont(Font.BOLD));
        headerPanel.add(statusLabel);

        topPanel.add(headerPanel, BorderLayout.NORTH);

        // Settings Grid
        JPanel configBox = new JPanel(new GridBagLayout());
        configBox.setBorder(new TitledBorder("Local Connector Authentication & Settings"));
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(4, 8, 4, 8);
        gbc.fill = GridBagConstraints.HORIZONTAL;

        // URL Field
        gbc.gridx = 0; gbc.gridy = 0; gbc.weightx = 0;
        configBox.add(new JLabel("AppSec Backend URL:"), gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        urlField = new JTextField("http://127.0.0.1:41785");
        configBox.add(urlField, gbc);

        // Token Field
        gbc.gridx = 0; gbc.gridy = 1; gbc.weightx = 0;
        configBox.add(new JLabel("Auth Token (X-AppSec-Token):"), gbc);
        gbc.gridx = 1; gbc.weightx = 1.0;
        JPanel tokenPanel = new JPanel(new BorderLayout(5, 0));
        tokenField = new JPasswordField(24);
        showTokenCheck = new JCheckBox("Show");
        showTokenCheck.addActionListener(e -> {
            tokenField.setEchoChar(showTokenCheck.isSelected() ? (char) 0 : '•');
        });
        tokenPanel.add(tokenField, BorderLayout.CENTER);
        tokenPanel.add(showTokenCheck, BorderLayout.EAST);
        configBox.add(tokenPanel, gbc);

        // Test Button
        gbc.gridx = 2; gbc.gridy = 0; gbc.gridheight = 2; gbc.weightx = 0;
        testConnButton = new JButton("Test Connection");
        testConnButton.addActionListener(e -> runHealthCheck());
        configBox.add(testConnButton, gbc);

        topPanel.add(configBox, BorderLayout.CENTER);

        // Filters Panel
        JPanel filterPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 6));
        filterPanel.setBorder(new TitledBorder("Interception & Export Controls"));

        liveIngestCheck = new JCheckBox("Enable Live Ingestion (Push to AppSec)");
        inScopeOnlyCheck = new JCheckBox("Only In-Scope Traffic", true);
        redactSecretsCheck = new JCheckBox("Redact Sensitive Secrets (Tokens, Cookies, Passwords)", true);

        filterPanel.add(liveIngestCheck);
        filterPanel.add(inScopeOnlyCheck);
        filterPanel.add(redactSecretsCheck);

        filterPanel.add(new JLabel("Domain Scope Filter:"));
        domainFilterField = new JTextField(15);
        domainFilterField.setToolTipText("e.g. *.target.com or leave empty to allow all");
        filterPanel.add(domainFilterField);

        topPanel.add(filterPanel, BorderLayout.SOUTH);
        add(topPanel, BorderLayout.NORTH);

        // 2. CENTER PANEL: Traffic Table & Inspector Split Pane
        String[] cols = new String[]{"#", "Time", "Method", "URL", "Status", "Size", "Latency", "Export Status"};
        tableModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) {
                return false;
            }
        };
        trafficTable = new JTable(tableModel);
        trafficTable.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
        trafficTable.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting()) {
                updateInspector();
            }
        });

        JScrollPane tableScroll = new JScrollPane(trafficTable);
        tableScroll.setPreferredSize(new Dimension(800, 240));

        // Inspector tabs (Request / Response)
        requestArea = new JTextArea();
        requestArea.setEditable(false);
        requestArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        JScrollPane reqScroll = new JScrollPane(requestArea);

        responseArea = new JTextArea();
        responseArea.setEditable(false);
        responseArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        JScrollPane resScroll = new JScrollPane(responseArea);

        JTabbedPane inspectorTabs = new JTabbedPane();
        inspectorTabs.addTab("Request Inspector", reqScroll);
        inspectorTabs.addTab("Response Inspector", resScroll);

        JSplitPane centerSplit = new JSplitPane(JSplitPane.VERTICAL_SPLIT, tableScroll, inspectorTabs);
        centerSplit.setDividerLocation(220);
        centerSplit.setResizeWeight(0.5);

        add(centerSplit, BorderLayout.CENTER);

        // 3. BOTTOM PANEL: Actions & Console Log
        JPanel bottomPanel = new JPanel(new BorderLayout(5, 5));

        JPanel actionButtons = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
        JButton exportSelectedBtn = new JButton("Export Selected to AppSec");
        exportSelectedBtn.addActionListener(e -> exportSelectedTraffic());

        JButton exportJsonFileBtn = new JButton("Save Selected to JSON File");
        exportJsonFileBtn.addActionListener(e -> saveSelectedToJsonFile());

        JButton createFindingBtn = new JButton("Create Finding from Selected");
        createFindingBtn.addActionListener(e -> showCreateFindingDialog());

        JButton clearTableBtn = new JButton("Clear Table");
        clearTableBtn.addActionListener(e -> clearTable());

        actionButtons.add(exportSelectedBtn);
        actionButtons.add(exportJsonFileBtn);
        actionButtons.add(createFindingBtn);
        actionButtons.add(clearTableBtn);

        bottomPanel.add(actionButtons, BorderLayout.NORTH);

        logArea = new JTextArea(4, 50);
        logArea.setEditable(false);
        logArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));
        JScrollPane logScroll = new JScrollPane(logArea);
        logScroll.setBorder(new TitledBorder("Integration Activity Log"));
        bottomPanel.add(logScroll, BorderLayout.CENTER);

        add(bottomPanel, BorderLayout.SOUTH);

        log("AppSec Nexus Burp Extension initialized successfully.");
    }

    private void runHealthCheck() {
        String url = urlField.getText().trim();
        String token = new String(tokenField.getPassword()).trim();
        client.updateConfig(url, token);

        statusLabel.setText("Checking connection...");
        statusLabel.setForeground(Color.ORANGE);
        testConnButton.setEnabled(false);

        executor.submit(() -> {
            AppSecConnectorClient.HealthCheckResult res = client.checkHealth();
            SwingUtilities.invokeLater(() -> {
                testConnButton.setEnabled(true);
                if (res.isConnected) {
                    statusLabel.setText("CONNECTED (" + res.latencyMs + "ms)");
                    statusLabel.setForeground(new Color(34, 139, 34)); // Dark green
                    log("Health check succeeded: " + res.message);
                } else {
                    statusLabel.setText("OFFLINE: " + res.message);
                    statusLabel.setForeground(Color.RED);
                    log("Health check error: " + res.message);
                }
            });
        });
    }

    private void updateInspector() {
        int selectedRow = trafficTable.getSelectedRow();
        if (selectedRow >= 0 && selectedRow < trafficRecords.size()) {
            TrafficRecord rec = trafficRecords.get(selectedRow);

            StringBuilder reqText = new StringBuilder();
            reqText.append(rec.method).append(" ").append(rec.path).append(" HTTP/1.1\n");
            reqText.append("Host: ").append(rec.host).append("\n");
            if (rec.requestHeaders != null) {
                for (var entry : rec.requestHeaders.entrySet()) {
                    if (!entry.getKey().equalsIgnoreCase("Host")) {
                        reqText.append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
                    }
                }
            }
            reqText.append("\n");
            if (rec.requestBody != null) {
                reqText.append(rec.requestBody);
            }
            requestArea.setText(reqText.toString());
            requestArea.setCaretPosition(0);

            StringBuilder resText = new StringBuilder();
            resText.append("HTTP/1.1 ").append(rec.statusCode).append("\n");
            if (rec.responseHeaders != null) {
                for (var entry : rec.responseHeaders.entrySet()) {
                    resText.append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
                }
            }
            resText.append("\n");
            if (rec.responseBody != null) {
                resText.append(rec.responseBody);
            }
            responseArea.setText(resText.toString());
            responseArea.setCaretPosition(0);
        } else {
            requestArea.setText("");
            responseArea.setText("");
        }
    }

    private void exportSelectedTraffic() {
        int[] rows = trafficTable.getSelectedRows();
        if (rows.length == 0) {
            JOptionPane.showMessageDialog(this, "Select at least one transaction in the table to export.", "No Selection", JOptionPane.WARNING_MESSAGE);
            return;
        }

        List<TrafficRecord> selected = new ArrayList<>();
        for (int r : rows) {
            if (r >= 0 && r < trafficRecords.size()) {
                TrafficRecord item = trafficRecords.get(r);
                if (isRedactSecrets()) {
                    item.redactSensitiveData();
                }
                selected.add(item);
            }
        }

        client.updateConfig(urlField.getText().trim(), new String(tokenField.getPassword()).trim());
        log("Exporting " + selected.size() + " items to AppSec Nexus...");

        executor.submit(() -> {
            AppSecConnectorClient.IngestionResult res = client.exportTraffic(selected);
            SwingUtilities.invokeLater(() -> {
                for (int r : rows) {
                    if (r < tableModel.getRowCount()) {
                        tableModel.setValueAt(res.isSuccess ? "Exported (Manual)" : "Failed", r, 7);
                    }
                }
                log("Export result: " + res.message);
                JOptionPane.showMessageDialog(this, res.message, res.isSuccess ? "Export Success" : "Export Error", res.isSuccess ? JOptionPane.INFORMATION_MESSAGE : JOptionPane.ERROR_MESSAGE);
            });
        });
    }

    private void saveSelectedToJsonFile() {
        int[] rows = trafficTable.getSelectedRows();
        if (rows.length == 0) {
            JOptionPane.showMessageDialog(this, "Select at least one transaction to save.", "No Selection", JOptionPane.WARNING_MESSAGE);
            return;
        }

        JFileChooser chooser = new JFileChooser();
        chooser.setSelectedFile(new File("burp_traffic_export_" + System.currentTimeMillis() + ".json"));
        int ret = chooser.showSaveDialog(this);
        if (ret == JFileChooser.APPROVE_OPTION) {
            File f = chooser.getSelectedFile();
            List<TrafficRecord> selected = new ArrayList<>();
            for (int r : rows) {
                if (r >= 0 && r < trafficRecords.size()) {
                    TrafficRecord item = trafficRecords.get(r);
                    if (isRedactSecrets()) {
                        item.redactSensitiveData();
                    }
                    selected.add(item);
                }
            }

            try (FileWriter fw = new FileWriter(f)) {
                fw.write(AppSecConnectorClient.serializeTrafficList(selected));
                log("Saved " + selected.size() + " transactions to " + f.getAbsolutePath());
                JOptionPane.showMessageDialog(this, "Saved " + selected.size() + " items to " + f.getName(), "Saved", JOptionPane.INFORMATION_MESSAGE);
            } catch (Exception ex) {
                log("Failed to save JSON: " + ex.getMessage());
                JOptionPane.showMessageDialog(this, "Error saving file: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void showCreateFindingDialog() {
        int selectedRow = trafficTable.getSelectedRow();
        String defaultUrl = "";
        String defaultEvidence = "";
        if (selectedRow >= 0 && selectedRow < trafficRecords.size()) {
            TrafficRecord rec = trafficRecords.get(selectedRow);
            defaultUrl = rec.url;
            defaultEvidence = "Request:\n" + rec.method + " " + rec.url + "\nResponse Status: " + rec.statusCode;
        }

        JTextField titleField = new JTextField("Vulnerability in " + (defaultUrl.isEmpty() ? "Target" : defaultUrl));
        JComboBox<String> sevBox = new JComboBox<>(new String[]{"Critical", "High", "Medium", "Low", "Info"});
        sevBox.setSelectedItem("Medium");
        JTextField urlField = new JTextField(defaultUrl);
        JTextField cweField = new JTextField("CWE-200");
        JTextArea evidenceArea = new JTextArea(defaultEvidence, 5, 30);

        JPanel panel = new JPanel(new GridLayout(0, 1, 4, 4));
        panel.add(new JLabel("Finding Title:"));
        panel.add(titleField);
        panel.add(new JLabel("Severity:"));
        panel.add(sevBox);
        panel.add(new JLabel("Affected URL:"));
        panel.add(urlField);
        panel.add(new JLabel("CWE Identifier:"));
        panel.add(cweField);
        panel.add(new JLabel("Evidence & Notes:"));
        panel.add(new JScrollPane(evidenceArea));

        int res = JOptionPane.showConfirmDialog(this, panel, "Create & Export Finding to AppSec", JOptionPane.OK_CANCEL_OPTION);
        if (res == JOptionPane.OK_OPTION) {
            FindingRecord finding = new FindingRecord(
                    titleField.getText().trim(),
                    (String) sevBox.getSelectedItem(),
                    urlField.getText().trim(),
                    evidenceArea.getText().trim()
            );
            finding.cwe = cweField.getText().trim();
            client.updateConfig(this.urlField.getText().trim(), new String(tokenField.getPassword()).trim());

            executor.submit(() -> {
                AppSecConnectorClient.IngestionResult r = client.exportFinding(finding);
                SwingUtilities.invokeLater(() -> {
                    log("Finding export: " + r.message);
                    JOptionPane.showMessageDialog(this, r.message, r.isSuccess ? "Success" : "Error", r.isSuccess ? JOptionPane.INFORMATION_MESSAGE : JOptionPane.ERROR_MESSAGE);
                });
            });
        }
    }

    private void clearTable() {
        trafficRecords.clear();
        tableModel.setRowCount(0);
        requestArea.setText("");
        responseArea.setText("");
        log("Traffic table cleared.");
    }
}
