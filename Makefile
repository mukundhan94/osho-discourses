.DEFAULT_GOAL := help
.PHONY: help build serve check media slugs bodycheck parity shots clean
# Take BASELINE as typed: make would otherwise expand $(...) in it as make syntax.
override BASELINE := $(value BASELINE)
export BASELINE

help: ## Show these targets
	@grep -E '^[a-z]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-6s %s\n", $$1, $$2}'

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

parity: build ## Compare _site/ with web/dist/: pages, head tags, links, labels and text
	python3 scripts/parity_check.py

shots: build ## Photograph _site/, then compare web/dist/ with the pictures
	PARITY_DIR=../_site npm --prefix web run shots:reference
	PARITY_DIR=dist npm --prefix web run shots:compare

clean: ## Remove the built site
	rm -rf _site
