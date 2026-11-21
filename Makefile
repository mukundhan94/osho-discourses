.DEFAULT_GOAL := help
.PHONY: help build serve test check media slugs clean

help: ## Show these targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-6s %s\n", $$1, $$2}'

build: ## Type-check, build the site into web/dist/ and check it
	npm --prefix web run build

serve: build ## Build, then serve at http://localhost:8431
	python3 -m http.server 8431 --bind 127.0.0.1 --directory web/dist

test: ## Run the unit tests
	npm --prefix web test

check: ## Compare the data with the raw wiki pages
	python3 scripts/wiki_check.py

media: ## Refresh data/media.csv (listen and watch links) from the wiki and OshoWorld
	python3 scripts/media_links.py

slugs: ## Give new series an address in data/slugs.csv
	npm --prefix web run slugs

clean: ## Remove the built site
	rm -rf web/dist
