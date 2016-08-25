PROJECTNAME = demakebot
HOMEDIR = $(shell pwd)
USER = bot
SERVER = smallcatlabs
SSHCMD = ssh $(USER)@$(SERVER)
APPDIR = /opt/$(PROJECTNAME)

pushall: sync
	git push origin master

sync:
	rsync -a $(HOMEDIR) $(USER)@$(SERVER):/opt/ --exclude node_modules/ --exclude image-output/
	$(SSHCMD) "cd $(APPDIR) && npm install"

# check-log:
	# $(SSHCMD) "journalctl -r -u $(PROJECTNAME)"

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
