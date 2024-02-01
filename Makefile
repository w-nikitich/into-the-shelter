# DATABASE
db:
	mkdir -p persistent/imported-data
	mkdir -p persistent/image-data

	docker-compose -f docker-compose.yml down;
	docker-compose -f docker-compose.yml up -d postgresql;
	until nc -z -v -w30 localhost 5432; do echo "Waiting for postgresql...";  sleep 5; done
	@echo "Database started..."

# SERVER SIDE
accounts:
	npm run start:dev shelter-accounts
	@echo "shelter-accounts is running...";

gateway:
	npm run start:dev shelter-gateway
	@echo "shelter-gateway is running...";


# CLIENT SIDE
cs:
    # npm install
	@if [ -d "apps/shelter-client/node_modules" ]; then \
		echo "[client] Node modules is exist"; \
	else \
		echo "Installing node_modules..."; \
		cd apps/shelter-client && npm install; \
    fi

    # npm run start
	npm run start --prefix ./apps/shelter-client
	@echo "[step 2] Client is running...";


kill:
	@echo "Killing all...";
	npx kill-port 3000
	npx kill-port 3001
	npx kill-port 8000