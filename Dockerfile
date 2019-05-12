FROM centos:latest
WORKDIR /opt
COPY . .
RUN yum install -y https://centos7.iuscommunity.org/ius-release.rpm
RUN yum update -y
RUN yum install -y python36u python36u-libs python36u-devel python36u-pip python36u-setuptools gcc bzip2
RUN pip3.6 install --upgrade pip
RUN curl -O https://repo.anaconda.com/archive/Anaconda3-2019.03-Linux-x86_64.sh | bash
RUN pip3.6 install networkx fa2 python-louvain
EXPOSE 8000
ENTRYPOINT ["./start_server.sh"]
