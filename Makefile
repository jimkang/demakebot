PROJECTNAME = demakebot
HOMEDIR = $(shell pwd)
USER = bot
PRIVUSER = root
SERVER = smallcatlabs
SSHCMD = ssh $(USER)@$(SERVER)
PRIVSSHCMD = ssh $(PRIVUSER)@$(SERVER)
APPDIR = /opt/$(PROJECTNAME)

pushall: sync set-permissions restart-remote
	git push origin master

sync:
	rsync -a $(HOMEDIR) $(USER)@$(SERVER):/opt/ \
		--exclude node_modules/ --exclude image-output/ --exclude data/
	$(SSHCMD) "cd $(APPDIR) && npm install"

set-permissions:
	$(SSHCMD) "chmod +x $(APPDIR)/$(PROJECTNAME)-responder.js"

check-log:
	$(SSHCMD) "journalctl -r -u $(PROJECTNAME)"

run-multiple:
	number=1 ; while [[ $$number -le 10 ]] ; do \
		node demakebot-post.js --dry; \
		((number = number + 1)) ; \
	done

run-dry-on-server:
	$(SSHCMD) "cd $(APPDIR) && node demakebot-post.js --dry"

run-on-server:
	$(SSHCMD) "cd $(APPDIR) && node demakebot-post.js"

get-image-output-from-server:
	$(SSHCMD) "cd $(APPDIR) && tar zcvf image-output.tgz image-output/*"
	scp $(USER)@$(SERVER):$(APPDIR)/image-output.tgz server-image-output.tgz
	tar zxvf server-image-output.tgz

lint:
	./node_modules/.bin/eslint .

update-remote: sync set-permissions restart-remote

restart-remote:
	$(PRIVSSHCMD) "service $(PROJECTNAME) restart"

install-service:
	$(PRIVSSHCMD) "cp $(APPDIR)/$(PROJECTNAME).service /etc/systemd/system && \
	systemctl enable $(PROJECTNAME)"

stop-remote:
	$(PRIVSSHCMD) "service $(PROJECTNAME) stop"

check-status:
	$(SSHCMD) "systemctl status $(PROJECTNAME)"

check-log:
	$(SSHCMD) "journalctl -r -u $(PROJECTNAME)"

make-data-dir:
	$(SSHCMD) "mkdir -p $(APPDIR)/data"
