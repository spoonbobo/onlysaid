{{/*
Expand the name of the chart.
*/}}
{{- define "onlysaid.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "onlysaid.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "onlysaid.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "onlysaid.labels" -}}
helm.sh/chart: {{ include "onlysaid.chart" . }}
{{ include "onlysaid.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "onlysaid.selectorLabels" -}}
app.kubernetes.io/name: {{ include "onlysaid.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "onlysaid.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "onlysaid.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate environment variables for database connections
*/}}
{{- define "onlysaid.dbEnvVars" -}}
- name: PGHOST
  value: "{{ .Release.Name }}-postgresql"
- name: PGUSER
  value: {{ .Values.postgresql.auth.username }}
- name: PGPASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Release.Name }}-postgresql
      key: password
- name: PGDATABASE
  value: {{ .Values.postgresql.auth.database }}
- name: PGPORT
  value: "5432"
- name: REDIS_HOST
  value: "{{ .Release.Name }}-redis-master"
- name: REDIS_PORT
  value: "6379"
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Release.Name }}-redis
      key: redis-password
{{- end }}

{{/*
Generate MariaDB environment variables for Moodle
*/}}
{{- define "onlysaid.mariadbEnvVars" -}}
- name: MOODLE_DATABASE_HOST
  value: "{{ .Release.Name }}-mariadb"
- name: MOODLE_DATABASE_PORT_NUMBER
  value: "3306"
- name: MOODLE_DATABASE_USER
  value: {{ .Values.mariadb.auth.username }}
- name: MOODLE_DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Release.Name }}-mariadb
      key: mariadb-password
- name: MOODLE_DATABASE_NAME
  value: {{ .Values.mariadb.auth.database }}
{{- end }}

{{/*
Generate N8N database environment variables
*/}}
{{- define "onlysaid.n8nDbEnvVars" -}}
- name: DB_POSTGRESDB_HOST
  value: "{{ .Release.Name }}-postgresql"
- name: DB_POSTGRESDB_PORT
  value: "5432"
- name: DB_POSTGRESDB_DATABASE
  value: "n8n_db"
- name: DB_POSTGRESDB_USER
  value: {{ .Values.postgresql.auth.username }}
- name: DB_POSTGRESDB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Release.Name }}-postgresql
      key: password
{{- end }}

{{/*
Generate service URLs for inter-service communication
*/}}
{{- define "onlysaid.serviceUrls" -}}
- name: SOCKET_SERVER_URL
  value: "http://{{ .Values.socketServer.name }}:{{ .Values.socketServer.service.port }}"
- name: KB_URL
  value: "http://{{ .Values.knowledgeBase.name }}:{{ .Values.knowledgeBase.service.port }}"
- name: NEXT_PUBLIC_KB_URL
  value: "http://{{ .Values.knowledgeBase.name }}:{{ .Values.knowledgeBase.service.port }}"
- name: OLLAMA_API_BASE_URL
  value: "http://{{ .Values.ollama.name }}:{{ .Values.ollama.service.port }}"
- name: QDRANT_URL
  value: "http://{{ .Values.qdrant.name }}:{{ .Values.qdrant.service.port }}"
{{- end }} 