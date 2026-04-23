.PHONY: dev dev-prepare

ROOT_DIR := $(CURDIR)
LOCAL_DIR := $(ROOT_DIR)/.local
COLLECTOR_DATA_DIR := $(LOCAL_DIR)/collector
GEOIP_DATA_DIR := $(LOCAL_DIR)/geoip

export DB_PATH ?= $(COLLECTOR_DATA_DIR)/stats.db
export GEOIP_MMDB_DIR ?= $(GEOIP_DATA_DIR)
export CH_ENABLED ?= 0

dev: dev-prepare
	@printf '\n[Neko Master] Local dev environment\n'
	@printf '  DB_PATH=%s\n' "$(DB_PATH)"
	@printf '  GEOIP_MMDB_DIR=%s\n' "$(GEOIP_MMDB_DIR)"
	@printf '  CH_ENABLED=%s\n\n' "$(CH_ENABLED)"
	pnpm turbo dev --env-mode=loose

dev-prepare:
	mkdir -p "$(COLLECTOR_DATA_DIR)" "$(GEOIP_DATA_DIR)"
