.PHONY: all deps test test-watch local-clean local-build local-run

NPM=$(shell which npm)
XCODEBUILD?=xcrun xcodebuild
XCODE_PROJECT?=Vimari.xcodeproj
XCODE_SCHEME?=Vimari
LOCAL_CONFIGURATION?=Debug
LOCAL_BUILD_DIR?=$(CURDIR)/build/local
LOCAL_DERIVED_DATA_DIR?=$(CURDIR)/build/DerivedData
LOCAL_APP=$(LOCAL_BUILD_DIR)/Vimari+.app

all: deps

deps:
	@$(NPM) install

test:
	@$(NPM) test

test-watch:
	@$(NPM) run test:watch

local-clean:
	@$(XCODEBUILD) \
		-project "$(XCODE_PROJECT)" \
		-scheme "$(XCODE_SCHEME)" \
		-configuration "$(LOCAL_CONFIGURATION)" \
		-destination 'platform=macOS' \
		-derivedDataPath "$(LOCAL_DERIVED_DATA_DIR)" \
		CONFIGURATION_BUILD_DIR="$(LOCAL_BUILD_DIR)" \
		clean

local-build: local-clean
	@$(XCODEBUILD) \
		-project "$(XCODE_PROJECT)" \
		-scheme "$(XCODE_SCHEME)" \
		-configuration "$(LOCAL_CONFIGURATION)" \
		-destination 'platform=macOS' \
		-derivedDataPath "$(LOCAL_DERIVED_DATA_DIR)" \
		CONFIGURATION_BUILD_DIR="$(LOCAL_BUILD_DIR)" \
		CODE_SIGN_IDENTITY=- \
		DEVELOPMENT_TEAM= \
		build
	@echo "Local app built at $(LOCAL_APP)"

local-run: local-build
	@open "$(LOCAL_APP)"
