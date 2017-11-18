FROM ubuntu:16.04
RUN apt-get update && apt-get install -y wget curl git python make g++ apt-transport-https build-essential ca-certificates gcc ghostscript sudo 
RUN wget -qO- https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs
RUN sh -c "apt-get update ; apt-get install docker.io -y ; bash"
ENV DOCKER_LOGIN demo
ENV DOCKER_PASSWORD demo
ENV DOCKER_GIT demo
ENV DOCKER_NAMESPACE com.demo.helloworld
ENV DOCKER_PROXY -1
RUN mkdir -p /opt/builder
RUN mkdir -p /opt/builder/var
COPY builder/. /opt/builder
WORKDIR /opt/builder
RUN npm install
ENV DOCKER_TAG 1.0.0
ENTRYPOINT node builder && docker login -u $DOCKER_LOGIN -p $DOCKER_PASSWORD && cd /opt/builder/var/*.app/ && docker build -t $DOCKER_NAMESPACE:$DOCKER_TAG . && docker push $DOCKER_NAMESPACE:$DOCKER_TAG && docker logout
