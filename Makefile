.DEFAULT_GOAL := help
.PHONY: help build serve check media bodycheck clean

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

bodycheck: build ## Compare the home page body with BASELINE=<saved copy of index.html>
	scripts/body_check.sh $(BASELINE)

clean: ## Remove the built site
	rm -rf _site
