.DEFAULT_GOAL := help
.PHONY: help build serve check media slugs bodycheck web serve-web parity shots clean
# Take BASELINE as typed: make would otherwise expand $(...) in it as make syntax.
override BASELINE := $(value BASELINE)
export BASELINE

help: ## Show these targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'

build: ## Build the site into _site/
	python3 scripts/build.py

serve: build ## Build, then serve at http://localhost:8431
	python3 -m http.server 8431 --bind 127.0.0.1 --directory _site

check: ## Compare the data with the raw wiki pages
	python3 scripts/wiki_check.py

media: ## Refresh data/media.csv (listen and watch links) from the wiki and OshoWorld
	python3 scripts/media_links.py

slugs: ## Give new series an address in data/slugs.csv
	python3 scripts/build.py --slugs

bodycheck: build ## Compare the home page body with BASELINE=<saved copy of index.html>
	scripts/body_check.sh "$$BASELINE"

web: ## Type-check and build the new (Astro) site into web/dist/
	npm --prefix web run build

serve-web: web ## Build the new site, then serve it at http://localhost:8433
	python3 -m http.server 8433 --bind 127.0.0.1 --directory web/dist

parity: build ## Compare _site/ with web/dist/: pages, head tags, links, labels and text
	python3 scripts/parity_check.py --islands

shots: build ## Photograph and drive _site/, then compare web/dist/ with the record
	PARITY_URL= PARITY_DIR=../_site npm --prefix web run shots:reference
	PARITY_URL= PARITY_DIR=dist npm --prefix web run shots:compare

clean: ## Remove the built site
	rm -rf _site
